import {
  Component,
  Event,
  EventEmitter,
  h,
  Method,
  Element,
  Prop,
  Host,
  Listen,
} from '@stencil/core';
import each from 'lodash/each';

import GridResizeService from '../revoGrid/viewport.resize.service';
import LocalScrollService from '../../services/localScrollService';
import { RevoGrid, ScrollCoordinateEvent } from '../../interfaces';
import {
  CONTENT_SLOT,
  FOOTER_SLOT,
  HEADER_SLOT,
} from '../revoGrid/viewport.helpers';
type Delta = 'deltaX' | 'deltaY';
type LocalScrollEvent = {
  preventDefault(): void;
} & { [x in Delta]: number };
@Component({
  tag: 'revogr-viewport-scroll',
  styleUrl: 'revogr-viewport-scroll-style.scss',
})
export class RevogrViewportScroll {
  @Prop() readonly rowHeader: boolean;
  @Event({ bubbles: true }) scrollViewport: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  @Event() resizeViewport: EventEmitter<RevoGrid.ViewPortResizeEvent>;
  @Event() scrollchange: EventEmitter<{
    type: RevoGrid.DimensionType;
    hasScroll: boolean;
  }>;

  /**
   * Silently scroll to coordinate
   * Made to align negative coordinates for mobile devices
  */
  @Event()
  silentScroll: EventEmitter<RevoGrid.ViewPortScrollEvent>;

  private scrollThrottling = 10;

  /**
   * Width of inner content
   */
  @Prop() contentWidth = 0;
  /**
   * Height of inner content
   */
  @Prop() contentHeight = 0;

  private oldValY = this.contentHeight;
  private oldValX = this.contentWidth;

  @Element() horizontalScroll: HTMLElement;
  private verticalScroll: HTMLElement;
  private header: HTMLElement;
  private footer: HTMLElement;

  /**
   * Static functions to bind wheel change
   */
  private horizontalMouseWheel: (e: Partial<LocalScrollEvent>) => void;
  private verticalMouseWheel: (e: Partial<LocalScrollEvent>) => void;

  private resizeService: GridResizeService;
  private scrollService: LocalScrollService;

  /**
   * Last mw event time for trigger scroll function below
   * If mousewheel function was ignored we still need to trigger render
   */
  private mouseWheelScrollTimestamp: Record<RevoGrid.DimensionType, number> = {
    rgCol: 0,
    rgRow: 0,
  };
  private lastKnownScrollCoordinate: Record<RevoGrid.DimensionType, number> = {
    rgCol: 0,
    rgRow: 0,
  };
  @Method() async setScroll(e: RevoGrid.ViewPortScrollEvent) {
    this.latestScrollUpdate(e.dimension);
    this.scrollService?.setScroll(e);
  }

  /**
   * update on delta in case we don't know existing position or external change
   * @param e
   */
  @Method() async changeScroll(
    e: RevoGrid.ViewPortScrollEvent,
    silent = false,
  ) {
    if (silent) {
      if (e.coordinate) {
        switch (e.dimension) {
          // for mobile devices to skip negative scroll loop. only on vertical scroll
          case 'rgRow':
            this.verticalScroll.style.transform = `translateY(${-1 * e.coordinate}px)`;
            break;
        }
      }
      return null;
    }
    if (e.delta) {
      switch (e.dimension) {
        case 'rgCol':
          e.coordinate = this.horizontalScroll.scrollLeft + e.delta;
          break;
        case 'rgRow':
          e.coordinate = this.verticalScroll.scrollTop + e.delta;
          break;
      }
      this.setScroll(e);
    }
    return e;
  }

  /**
   * Dispatch this event to trigger vertical mouse wheel from plugins
   */
  @Listen('mousewheel-vertical') mousewheelVertical({
    detail: e,
  }: CustomEvent<LocalScrollEvent>) {
    this.verticalMouseWheel(e);
  }
  /**
   * Dispatch this event to trigger horizontal mouse wheel from plugins
   */
  @Listen('mousewheel-horizontal') mousewheelHorizontal({
    detail: e,
  }: CustomEvent<LocalScrollEvent>) {
    this.horizontalMouseWheel(e);
  }
  /**
   * Allows to use outside listener
   */
  @Listen('scroll-coordinate') scrollApply({
    detail: { type, coordinate },
  }: CustomEvent<ScrollCoordinateEvent>) {
    this.applyOnScroll(type, coordinate, true);
  }

  connectedCallback() {
    /**
     * Bind scroll functions for farther usage
     */
    if ('ontouchstart' in document.documentElement) {
      this.scrollThrottling = 0;
    }
    // allow mousewheel for all devices including mobile
    this.verticalMouseWheel = this.onVerticalMouseWheel.bind(
      this,
      'rgRow',
      'deltaY',
    );
    this.horizontalMouseWheel = this.onHorizontalMouseWheel.bind(
      this,
      'rgCol',
      'deltaX',
    );
    /**
     * Create local scroll service
     */
    this.scrollService = new LocalScrollService({
      // to improve safari smoothnes on scroll
      // skipAnimationFrame: isSafariDesktop(),
      beforeScroll: e => this.scrollViewport.emit(e),
      afterScroll: e => {
        this.lastKnownScrollCoordinate[e.dimension] = e.coordinate;
        switch (e.dimension) {
          case 'rgCol':
            this.horizontalScroll.scrollLeft = e.coordinate;
            break;
          case 'rgRow':
            // this will trigger on scroll event
            this.verticalScroll.scrollTop = e.coordinate;
            // for mobile devices to skip negative scroll loop. only on vertical scroll
            if (this.verticalScroll.style.transform) {
              this.verticalScroll.style.transform = '';
            }
            break;
        }
      },
    });
  }

  componentDidLoad() {
    // track horizontal viewport resize
    this.resizeService = new GridResizeService(this.horizontalScroll, {
      resize: entries => {
        let height = entries[0]?.contentRect.height || 0;
        if (height) {
          height -= this.header.clientHeight + this.footer.clientHeight;
        }
        const els = {
          rgRow: {
            size: height,
            contentSize: this.contentHeight,
            scroll: this.verticalScroll.scrollTop,
          },
          rgCol: {
            size: entries[0]?.contentRect.width || 0,
            contentSize: this.contentWidth,
            scroll: this.horizontalScroll.scrollLeft,
          },
        };
        each(els, (item, dimension: RevoGrid.DimensionType) => {
          this.resizeViewport.emit({ dimension, size: item.size, rowHeader: this.rowHeader });
          this.scrollService?.scroll(item.scroll, dimension, true);
          // track scroll visibility on outer element change
          this.setScrollVisibility(dimension, item.size, item.contentSize);
        });
      },
    });
  }

  /**
   * Check if scroll present or not per type
   * Trigger this method on inner content size change or on outer element size change
   * If inner content bigger then outer size then scroll is present and mousewheel binding required
   * @param type - dimension type 'rgRow/y' or 'rgCol/x'
   * @param size - outer content size
   * @param innerContentSize - inner content size
   */
  setScrollVisibility(
    type: RevoGrid.DimensionType,
    size: number,
    innerContentSize: number,
  ) {
    // test if scroll present
    const hasScroll = size < innerContentSize;
    let el: HTMLElement;
    // event reference for binding
    switch (type) {
      case 'rgCol':
        el = this.horizontalScroll;
        break;
      case 'rgRow':
        el = this.verticalScroll;
        break;
    }
    // based on scroll visibility assign or remove class and event
    if (hasScroll) {
      el.classList.add(`scroll-${type}`);
    } else {
      el.classList.remove(`scroll-${type}`);
    }
    this.scrollchange.emit({ type, hasScroll });
  }

  disconnectedCallback() {
    this.resizeService.destroy();
  }

  async componentDidRender() {
    // scroll update if number of rows changed
    if (this.contentHeight < this.oldValY && this.verticalScroll) {
      this.verticalScroll.scrollTop += this.contentHeight - this.oldValY;
    }
    this.oldValY = this.contentHeight;

    // scroll update if number of cols changed
    if (this.contentWidth < this.oldValX) {
      this.horizontalScroll.scrollLeft += this.contentWidth - this.oldValX;
    }
    this.oldValX = this.contentWidth;

    this.scrollService.setParams(
      {
        contentSize: this.contentHeight,
        clientSize: this.verticalScroll.clientHeight,
        virtualSize: 0,
      },
      'rgRow',
    );

    this.scrollService.setParams(
      {
        contentSize: this.contentWidth,
        clientSize: this.horizontalScroll.clientWidth,
        virtualSize: 0,
      },
      'rgCol',
    );
    this.setScrollVisibility(
      'rgRow',
      this.verticalScroll.clientHeight,
      this.contentHeight,
    );
    this.setScrollVisibility(
      'rgCol',
      this.horizontalScroll.clientWidth,
      this.contentWidth,
    );
  }

  render() {
    return (
      <Host
        onWheel={this.horizontalMouseWheel}
        onScroll={(e: UIEvent) => this.onScroll('rgCol', e)}
      >
        <div
          class="inner-content-table"
          style={{ width: `${this.contentWidth}px` }}
        >
          <div class="header-wrapper" ref={e => (this.header = e)}>
            <slot name={HEADER_SLOT} />
          </div>
          <div
            class="vertical-inner"
            ref={el => (this.verticalScroll = el)}
            onWheel={this.verticalMouseWheel}
            onScroll={(e: MouseEvent) => this.onScroll('rgRow', e)}
          >
            <div
              class="content-wrapper"
              style={{ height: `${this.contentHeight}px` }}
            >
              <slot name={CONTENT_SLOT} />
            </div>
          </div>
          <div class="footer-wrapper" ref={e => (this.footer = e)}>
            <slot name={FOOTER_SLOT} />
          </div>
        </div>
      </Host>
    );
  }
  /**
   * Extra layer for scroll event monitoring, where MouseWheel event is not passing
   * We need to trigger scroll event in case there is no mousewheel event
   */
  @Method() onScroll(type: RevoGrid.DimensionType, e: UIEvent) {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    const target = e.target;
    let scroll = 0;
    switch (type) {
      case 'rgCol':
        scroll = target?.scrollLeft;
        break;
      case 'rgRow':
        scroll = target?.scrollTop;
        break;
    }

    // for mobile devices to skip negative scroll loop
    if (scroll < 0) {
      this.silentScroll.emit({ dimension: type, coordinate: scroll });
      return;
    }
    this.applyOnScroll(type, scroll);
  }

  /**
   * Applies scroll on scroll event only if mousewheel event was some time ago
   */
  private applyOnScroll(
    type: RevoGrid.DimensionType,
    coordinate: number,
    outside = false,
  ) {
    const change = new Date().getTime() - this.mouseWheelScrollTimestamp[type];
    // apply after throttling
    if (change > this.scrollThrottling && coordinate !== this.lastKnownScrollCoordinate[type]) {
      this.scrollService?.scroll(
        coordinate,
        type,
        undefined,
        undefined,
        outside,
      );
    }
  }

  /** remember last mw event time */
  private latestScrollUpdate(dimension: RevoGrid.DimensionType) {
    this.mouseWheelScrollTimestamp[dimension] = new Date().getTime();
  }

  /**
   * On vertical mousewheel event
   * @param type
   * @param delta
   * @param e
   */
  private onVerticalMouseWheel(
    type: RevoGrid.DimensionType,
    delta: Delta,
    e: LocalScrollEvent,
  ) {
    e.preventDefault && e.preventDefault();
    const pos = this.verticalScroll.scrollTop + e[delta];
    this.scrollService?.scroll(pos, type, undefined, e[delta]);
    this.latestScrollUpdate(type);
  }

  /**
   * On horizontal mousewheel event
   * @param type
   * @param delta
   * @param e
   */
  private onHorizontalMouseWheel(
    type: RevoGrid.DimensionType,
    delta: Delta,
    e: LocalScrollEvent,
  ) {
    e.preventDefault && e.preventDefault();
    const pos = this.horizontalScroll.scrollLeft + e[delta];
    this.scrollService?.scroll(pos, type, undefined, e[delta]);
    this.latestScrollUpdate(type);
  }
}
