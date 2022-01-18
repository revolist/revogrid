import { Component, Event, EventEmitter, h, Method, Element, Prop, Host, Listen } from '@stencil/core';
import each from 'lodash/each';

import GridResizeService from '../revoGrid/viewport.resize.service';
import LocalScrollService from '../../services/localScrollService';
import { RevoGrid } from '../../interfaces';
import { CONTENT_SLOT, FOOTER_SLOT, HEADER_SLOT } from '../revoGrid/viewport.helpers';
type Delta = 'deltaX' | 'deltaY';
type ScrollEvent = {
  preventDefault(): void;
} & {[x in Delta]: number;};
/**
 * Service for tracking grid scrolling
 */
@Component({
  tag: 'revogr-viewport-scroll',
  styleUrl: 'revogr-viewport-scroll-style.scss',
})
export class RevogrViewportScroll {
  @Event({ bubbles: false }) scrollViewport: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  @Event() resizeViewport: EventEmitter<RevoGrid.ViewPortResizeEvent>;
  @Event() scrollchange: EventEmitter<{ type: RevoGrid.DimensionType; hasScroll: boolean }>;

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
  private horizontalMouseWheel: (e: Partial<ScrollEvent>) => void;
  private verticalMouseWheel: (e: Partial<ScrollEvent>) => void;

  private resizeService: GridResizeService;
  private scrollService: LocalScrollService;

  /**
   * Last mw event time for trigger scroll function below
   * If mousewheel function was ignored we still need to trigger render
   */
  private mouseWheelScroll: Record<RevoGrid.DimensionType, number> = { rgCol: 0, rgRow: 0 };
  @Method() async setScroll(e: RevoGrid.ViewPortScrollEvent): Promise<void> {
    this.latestScrollUpdate(e.dimension);
    this.scrollService?.setScroll(e);
  }

  /**
   * update on delta in case we don't know existing position or external change
   * @param e
   */
  @Method() async changeScroll(e: RevoGrid.ViewPortScrollEvent): Promise<RevoGrid.ViewPortScrollEvent> {
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

  @Listen('mousewheel-vertical') mousewheelVertical({ detail: e }: CustomEvent<ScrollEvent>) {
    this.verticalMouseWheel(e);
  }

  connectedCallback() {
    /**
     * Bind scroll functions for farther usage
     */

    if ('ontouchstart' in document.documentElement) {
      this.scrollThrottling = 0;
    } else {
      this.verticalMouseWheel = this.onVerticalMouseWheel.bind(this, 'rgRow', 'deltaY');
      this.horizontalMouseWheel = this.onHorizontalMouseWheel.bind(this, 'rgCol', 'deltaX');
    }
    /**
     * Create local scroll service
     */
    this.scrollService = new LocalScrollService({
      beforeScroll: e => this.scrollViewport.emit(e),
      afterScroll: e => {
        switch (e.dimension) {
          case 'rgCol':
            this.horizontalScroll.scrollLeft = e.coordinate;
            break;
          case 'rgRow':
            this.verticalScroll.scrollTop = e.coordinate;
            break;
        }
      },
    });
  }

  componentDidLoad() {
    /**
     * Track horizontal viewport resize
     */
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
          this.resizeViewport.emit({ dimension, size: item.size });
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
  setScrollVisibility(type: RevoGrid.DimensionType, size: number, innerContentSize: number) {
    // test if scroll present
    const hasScroll = size < innerContentSize;
    let el: HTMLElement;
    // event reference for binding
    let event: (e: MouseEvent) => void;
    switch (type) {
      case 'rgCol':
        el = this.horizontalScroll;
        event = this.horizontalMouseWheel;
        break;
      case 'rgRow':
        el = this.verticalScroll;
        event = this.verticalMouseWheel;
        break;
    }
    // based on scroll visibility assign or remove class and event
    if (hasScroll) {
      el.classList.add(`scroll-${type}`);
      el.addEventListener('mousewheel', event);
    } else {
      el.classList.remove(`scroll-${type}`);
      el.removeEventListener('mousewheel', event);
    }
    this.scrollchange.emit({ type, hasScroll });
  }

  disconnectedCallback() {
    this.verticalScroll.removeEventListener('mousewheel', this.verticalMouseWheel);
    this.horizontalScroll.removeEventListener('mousewheel', this.horizontalMouseWheel);
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
    this.setScrollVisibility('rgRow', this.verticalScroll.clientHeight, this.contentHeight);
    this.setScrollVisibility('rgCol', this.horizontalScroll.clientWidth, this.contentWidth);
  }

  render() {
    return (
      <Host onScroll={(e: MouseEvent) => this.onScroll('rgCol', e)}>
        <div class="inner-content-table" style={{ width: `${this.contentWidth}px` }}>
          <div class="header-wrapper" ref={e => (this.header = e)}>
            <slot name={HEADER_SLOT} />
          </div>
          <div class="vertical-inner" ref={el => (this.verticalScroll = el)} onScroll={(e: MouseEvent) => this.onScroll('rgRow', e)}>
            <div class="content-wrapper" style={{ height: `${this.contentHeight}px` }}>
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
  private onScroll(dimension: RevoGrid.DimensionType, e: MouseEvent) {
    const target = e.target as HTMLElement | undefined;
    let scroll = 0;
    switch (dimension) {
      case 'rgCol':
        scroll = target?.scrollLeft;
        break;
      case 'rgRow':
        scroll = target?.scrollTop;
        break;
    }
    const change = new Date().getTime() - this.mouseWheelScroll[dimension];
    if (change > this.scrollThrottling) {
      this.scrollService?.scroll(scroll, dimension);
    }
  }

  /** remember last mw event time */
  private latestScrollUpdate(dimension: RevoGrid.DimensionType) {
    this.mouseWheelScroll[dimension] = new Date().getTime();
  }

  /**
   * On vertical mousewheel event
   * @param type
   * @param delta
   * @param e
   */
  private onVerticalMouseWheel(type: RevoGrid.DimensionType, delta: Delta, e: ScrollEvent) {
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
  private onHorizontalMouseWheel(type: RevoGrid.DimensionType, delta: Delta, e: ScrollEvent) {
    e.preventDefault && e.preventDefault();
    const pos = this.horizontalScroll.scrollLeft + e[delta];
    this.scrollService?.scroll(pos, type, undefined, e[delta]);
    this.latestScrollUpdate(type);
  }
}
