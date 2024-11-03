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

import GridResizeService from '../revoGrid/viewport.resize.service';
import LocalScrollService from '../../services/local.scroll.service';
import { LocalScrollTimer } from '../../services/local.scroll.timer';
import {
  CONTENT_SLOT,
  FOOTER_SLOT,
  HEADER_SLOT,
} from '../revoGrid/viewport.helpers';
import type {
  DimensionCols,
  DimensionType,
  ElementScroll,
  ScrollCoordinateEvent,
  ViewPortResizeEvent,
  ViewPortScrollEvent
} from '@type';

type Delta = 'deltaX' | 'deltaY';
type LocalScrollEvent = {
  preventDefault(): void;
} & { [x in Delta]: number };

/**
 * Viewport scroll component for RevoGrid
 * @slot - content
 * @slot header - header
 * @slot footer - footer
 */
@Component({
  tag: 'revogr-viewport-scroll',
  styleUrl: 'revogr-viewport-scroll-style.scss',
})
export class RevogrViewportScroll implements ElementScroll {
  /**
   * Enable row header
  */
  @Prop() readonly rowHeader: boolean;

  /**
   * Width of inner content
   */
  @Prop() contentWidth = 0;
  /**
   * Height of inner content
   */
  @Prop() contentHeight = 0;

  @Prop() colType!: DimensionCols | 'rowHeaders';

  /**
   * Before scroll event
   */
  @Event({ eventName: 'scrollviewport', bubbles: true }) scrollViewport: EventEmitter<ViewPortScrollEvent>;
  /**
   * Viewport resize
   */
  @Event({ eventName: 'resizeviewport' }) resizeViewport: EventEmitter<ViewPortResizeEvent>;

  /**
   * Triggered on scroll change, can be used to get information about scroll visibility
   */
  @Event() scrollchange: EventEmitter<{
    type: DimensionType;
    hasScroll: boolean;
  }>;

  /**
   * Silently scroll to coordinate
   * Made to align negative coordinates for mobile devices
  */
  @Event({ eventName: 'scrollviewportsilent' }) silentScroll: EventEmitter<ViewPortScrollEvent>;

  @Element() horizontalScroll: HTMLElement;

  private oldValY = this.contentHeight;
  private oldValX = this.contentWidth;

  private verticalScroll?: HTMLElement;
  private header?: HTMLElement;
  private footer?: HTMLElement;

  /**
   * Static functions to bind wheel change
   */
  private horizontalMouseWheel: (e: Partial<LocalScrollEvent>) => void;
  private verticalMouseWheel: (e: Partial<LocalScrollEvent>) => void;

  private resizeService?: GridResizeService;
  private localScrollService: LocalScrollService;
  private localScrollTimer: LocalScrollTimer;


  @Method() async setScroll(e: ViewPortScrollEvent) {
    this.localScrollTimer.latestScrollUpdate(e.dimension);
    this.localScrollService?.setScroll(e);
  }

  /**
   * update on delta in case we don't know existing position or external change
   * @param e
   */
  @Method() async changeScroll(
    e: ViewPortScrollEvent,
    silent = false,
  ) {
    if (silent) {
      if (e.coordinate && this.verticalScroll) {
        switch (e.dimension) {
          // for mobile devices to skip negative scroll loop. only on vertical scroll
          case 'rgRow':
            this.verticalScroll.style.transform = `translateY(${-1 * e.coordinate}px)`;
            break;
        }
      }
      return;
    }
    if (e.delta) {
      switch (e.dimension) {
        case 'rgCol':
          e.coordinate = this.horizontalScroll.scrollLeft + e.delta;
          break;
        case 'rgRow':
          e.coordinate = (this.verticalScroll?.scrollTop ?? 0) + e.delta;
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
    this.localScrollTimer = new LocalScrollTimer('ontouchstart' in document.documentElement ? 0 : 10);
    /**
     * Create local scroll service
     */
    this.localScrollService = new LocalScrollService({
      // to improve safari smoothnes on scroll
      // skipAnimationFrame: isSafariDesktop(),
      runScroll: e => this.scrollViewport.emit(e),
      applyScroll: e => {
        this.localScrollTimer.setCoordinate(e);
        switch (e.dimension) {
          case 'rgCol':
            // this will trigger on scroll event
            this.horizontalScroll.scrollLeft = e.coordinate;
            break;
          case 'rgRow':
            if (this.verticalScroll) {
              // this will trigger on scroll event
              this.verticalScroll.scrollTop = e.coordinate;
              // for mobile devices to skip negative scroll loop. only on vertical scroll
              if (this.verticalScroll.style.transform) {
                this.verticalScroll.style.transform = '';
              }
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
          height -= (this.header?.clientHeight ?? 0) + (this.footer?.clientHeight ?? 0);
        }
        const els = {
          rgRow: {
            size: height,
            contentSize: this.contentHeight,
            scroll: this.verticalScroll?.scrollTop,
            noScroll: false,
          },
          rgCol: {
            size: entries[0]?.contentRect.width || 0,
            contentSize: this.contentWidth,
            scroll: this.horizontalScroll.scrollLeft,
            noScroll: this.colType !== 'rgCol',
          },
        };
        for (const [dim, item] of Object.entries(els)) {
          const dimension = dim as DimensionType;
          this.resizeViewport.emit({ dimension, size: item.size, rowHeader: this.rowHeader });
          if (item.noScroll) {
            continue;
          }
          this.localScrollService?.scroll(item.scroll ?? 0, dimension, true);
          // track scroll visibility on outer element change
          this.setScrollVisibility(dimension, item.size, item.contentSize);
        }
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
    type: DimensionType,
    size: number,
    innerContentSize: number,
  ) {
    // test if scroll present
    const hasScroll = size < innerContentSize;
    let el: HTMLElement | undefined;
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
      el?.classList.add(`scroll-${type}`);
    } else {
      el?.classList.remove(`scroll-${type}`);
    }
    this.scrollchange.emit({ type, hasScroll });
  }

  disconnectedCallback() {
    this.resizeService?.destroy();
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

    this.localScrollService.setParams(
      {
        contentSize: this.contentHeight,
        clientSize: this.verticalScroll?.clientHeight ?? 0,
        virtualSize: 0,
      },
      'rgRow',
    );

    this.localScrollService.setParams(
      {
        contentSize: this.contentWidth,
        clientSize: this.horizontalScroll.clientWidth,
        virtualSize: 0,
      },
      'rgCol',
    );
    this.setScrollVisibility(
      'rgRow',
      this.verticalScroll?.clientHeight ?? 0,
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
        onScroll={(e: UIEvent) => this.applyScroll('rgCol', e)}
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
            onScroll={(e: MouseEvent) => this.applyScroll('rgRow', e)}
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
  @Method() async applyScroll(type: DimensionType, e: UIEvent) {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    let scroll = 0;
    switch (type) {
      case 'rgCol':
        scroll = e.target.scrollLeft;
        break;
      case 'rgRow':
        scroll = e.target.scrollTop;
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
   * Applies change on scroll event only if mousewheel event happened some time ago
   */
  private applyOnScroll(
    type: DimensionType,
    coordinate: number,
    outside = false,
  ) {
    // apply after throttling
    if (this.localScrollTimer.isReady(type, coordinate)) {
      this.localScrollService?.scroll(
        coordinate,
        type,
        undefined,
        undefined,
        outside,
      );
    }
  }

  /**
   * On vertical mousewheel event
   * @param type
   * @param delta
   * @param e
   */
  private onVerticalMouseWheel(
    type: DimensionType,
    delta: Delta,
    e: LocalScrollEvent,
  ) {
    const scrollTop = this.verticalScroll?.scrollTop ?? 0;
    const clientHeight = this.verticalScroll?.clientHeight ?? 0;
    const scrollHeight = this.verticalScroll?.scrollHeight ?? 0;

    // Detect if the user has reached the bottom
    const atBottom = (scrollTop + clientHeight >= scrollHeight) && e.deltaY > 0;
    const atTop = scrollTop === 0 && e.deltaY < 0;
    if (!atBottom && !atTop) {
      e.preventDefault?.();
    }
    const pos = scrollTop + e[delta];
    this.localScrollService?.scroll(pos, type, undefined, e[delta]);
    this.localScrollTimer.latestScrollUpdate(type);
  }

  /**
   * On horizontal mousewheel event
   * @param type
   * @param delta
   * @param e
   */
  private onHorizontalMouseWheel(
    type: DimensionType,
    delta: Delta,
    e: LocalScrollEvent,
  ) {
    if (!e.deltaX) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = this.horizontalScroll;

    // Detect if the user has reached the right end
    const atRight = (scrollLeft + clientWidth >= scrollWidth) && e.deltaX > 0;

    // Detect if the user has reached the left end
    const atLeft = scrollLeft === 0 && e.deltaX < 0;
    if (!atRight && !atLeft) {
      e.preventDefault?.();
    }
    const pos = scrollLeft + e[delta];
    this.localScrollService?.scroll(pos, type, undefined, e[delta]);
    this.localScrollTimer.latestScrollUpdate(type);
  }
}
