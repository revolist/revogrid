import {
  Component,
  Element as StencilElement,
  Event,
  EventEmitter,
  h,
  Host,
  Method,
  Prop,
} from '@stencil/core';
import LocalScrollService, {
  getContentSize,
} from '../../services/local.scroll.service';
import type {
  DimensionType,
  ViewPortScrollEvent,
} from '@type';
import { AutohideScrollPlugin } from './autohide-scroll.plugin';
import { LocalScrollTimer } from '../../services/local.scroll.timer';
import type { DimensionStore } from '@store';
import { getScrollbarSize } from '../../utils';

/**
 * Virtual scroll component
 */
@Component({
  tag: 'revogr-scroll-virtual',
  styleUrl: 'revogr-scroll-style.scss',
})
export class RevogrScrollVirtual {
  /**
   * Scroll dimension (`X` - `rgCol` or `Y` - `rgRow`)
   */
  @Prop() dimension: DimensionType = 'rgRow';

  /**
   * Content size for scrollbars without a dimension store.
   */
  @Prop() realSize = 0;

  /** Grid-owned size source, updated before component rendering. */
  @Prop() dimensionStore?: DimensionStore['store'];

  private stopSizeSync?: () => void;

  private get contentSize() {
    return this.dimensionStore?.get('realSize') ?? this.realSize;
  }

  /**
   * Virtual size
   */
  @Prop() virtualSize!: number;

  /**
   * Client size
   */
  @Prop() clientSize!: number;

  /**
   * Scroll event
   */
  @Event({ eventName: 'scrollvirtual' })
  scrollVirtual: EventEmitter<ViewPortScrollEvent>;

  @StencilElement() element: HTMLElement;
  private autohideScrollPlugin: AutohideScrollPlugin;
  private scrollSize = 0;
  private localScrollService: LocalScrollService;
  private localScrollTimer: LocalScrollTimer;
  private resizeObserver?: ResizeObserver;
  private observedViewportElements: Element[] = [];

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    if (this.dimension !== e.dimension) {
      return;
    }
    this.localScrollTimer.latestScrollUpdate(e.dimension);
    this.localScrollService?.setScroll(e);
    if (e.coordinate) {
      this.autohideScrollPlugin.checkScroll({
        scrollSize: this.scrollSize,
        contentSize: this.contentSize,
        virtualSize: this.virtualSize,
      });
    }
  }

  /**
   * Update if `delta` exists in case we don't know current position or if it's external change
   */
  @Method()
  async changeScroll(e: ViewPortScrollEvent): Promise<ViewPortScrollEvent> {
    if (e.delta) {
      const scrollProperty = e.dimension === 'rgRow' ? 'scrollTop' : 'scrollLeft';
      const currentPhysicalCoordinate = this.element[scrollProperty];
      return this.localScrollService.setScrollByDelta(
        e,
        currentPhysicalCoordinate,
      );
    }
    return e;
  }

  connectedCallback() {
    this.autohideScrollPlugin = new AutohideScrollPlugin(this.element);
    this.localScrollTimer = new LocalScrollTimer(
      'ontouchstart' in document.documentElement ? 0 : 10,
    );
    this.localScrollService = new LocalScrollService({
      runScroll: e => this.scrollVirtual.emit(e),
      applyScroll: e => {
        const type = e.dimension === 'rgRow' ? 'scrollTop' : 'scrollLeft';
        // this will trigger on scroll event
        this.element[type] = e.coordinate;
        const coordinate = this.element[type];
        this.localScrollTimer.setCoordinate({ ...e, coordinate });
        return coordinate;
      },
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateScrollSize());
      this.resizeObserver.observe(this.element);
    }
    this.stopSizeSync = this.dimensionStore?.onChange('realSize', () => this.updateScrollSize());
  }

  disconnectedCallback() {
    this.stopSizeSync?.();
    this.stopSizeSync = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.observedViewportElements = [];
    this.autohideScrollPlugin.clear();
  }

  componentWillLoad() {
    this.scrollSize = getScrollbarSize(document);
  }

  private getContentViewport() {
    const grid = this.element.closest('revo-grid');
    // Slotted content (including wrapped scrollbars) belongs to an external
    // owner. Do not replace its supplied size with the grid's main viewport.
    const slotted = this.element.closest('[slot]');
    if (slotted && slotted !== grid && grid?.contains(slotted)) return null;
    // The cached clientSize is updated by a throttled ResizeObserver. Measure
    // only this grid's viewport, excluding pinned areas and nested grids.
    const viewports = grid?.querySelector(':scope > .main-viewport > .viewports');
    const viewport = viewports?.querySelector(':scope > revogr-viewport-scroll.rgCol')
      ?? viewports?.querySelector(':scope > revogr-viewport-scroll');
    return viewport;
  }

  private getViewportSize() {
    const viewport = this.getContentViewport();
    if (!viewport) return this.virtualSize || this.clientSize;
    if (this.dimension === 'rgCol') return viewport.clientWidth;
    // The body may still reflect the previous source while child components
    // render. Measure available space, excluding headers and pinned rows,
    // instead of the body's temporarily shrunken content height.
    const header = viewport.querySelector('.inner-content-table > .header-wrapper');
    const footer = viewport.querySelector('.inner-content-table > .footer-wrapper');
    return Math.max(0, viewport.clientHeight - (header?.clientHeight ?? 0) - (footer?.clientHeight ?? 0));
  }

  componentDidRender() {
    const viewport = this.getContentViewport();
    const elements: Element[] = viewport ? [viewport] : [];
    if (viewport && this.dimension === 'rgRow') {
      // Header/pinned-row heights can change without resizing either host.
      for (const area of ['header', 'footer']) {
        const wrapper = viewport.querySelector(`.inner-content-table > .${area}-wrapper`);
        if (wrapper) elements.push(wrapper);
      }
    }
    for (const element of this.observedViewportElements) {
      if (!elements.includes(element)) this.resizeObserver?.unobserve(element);
    }
    for (const element of elements) {
      if (!this.observedViewportElements.includes(element)) this.resizeObserver?.observe(element);
    }
    this.observedViewportElements = elements;
    this.updateScrollSize();
  }

  private updateScrollSize() {
    // A host resize can happen before Stencil renders new dimension props. Sync
    // the spacer before paint as well as after render, rather than adding a frame
    // of overflow while waiting for another component update.
    const content = this.element.firstElementChild as HTMLElement | null;
    if (content) {
      const property = this.dimension === 'rgRow' ? 'height' : 'width';
      content.style[property] = `${getContentSize(
        this.contentSize,
        this.dimension === 'rgRow' ? this.element.clientHeight : this.element.clientWidth,
        this.getViewportSize(),
      )}px`;
    }
    let scrollSize = 0;
    if (this.dimension === 'rgRow') {
      scrollSize = this.element.scrollHeight > this.element.clientHeight ? this.scrollSize : 0;
      this.element.style.minWidth = `${scrollSize}px`;
    } else {
      scrollSize = this.element.scrollWidth > this.element.clientWidth ? this.scrollSize : 0;
      this.element.style.minHeight = `${scrollSize}px`;
    }
    this.autohideScrollPlugin.setScrollSize(scrollSize);
    this.localScrollService.setParams(
      {
        contentSize: this.contentSize,
        clientSize: this.dimension === 'rgRow' ?  this.element.clientHeight : this.element.clientWidth,
        virtualSize: this.getViewportSize(),
      },
      this.dimension,
    );
  }

  onScroll(e: MouseEvent) {
    if (!(e.target instanceof Element)) {
      return;
    }
    const target = e.target;
    let type: 'scrollLeft' | 'scrollTop' = 'scrollLeft';
    if (this.dimension === 'rgRow') {
      type = 'scrollTop';
    }

    const setScroll = () => {
      this.localScrollService?.scroll(target[type] || 0, this.dimension);
    };
    // apply after throttling
    if (this.localScrollTimer.isReady(this.dimension, target[type])) {
      setScroll();
    } else {
      this.localScrollTimer.throttleLastScrollUpdate(this.dimension, target[type] || 0, () => setScroll());
    }
  }

  render() {
    const size = getContentSize(
      this.contentSize,
      this.dimension === 'rgRow' ?  this.element.clientHeight : this.element.clientWidth,
      this.getViewportSize(), // measure with the same layout as the scrollbar
    );
    return (
      <Host onScroll={(e: MouseEvent) => this.onScroll(e)}>
        <div
          style={{
            [this.dimension === 'rgRow' ? 'height' : 'width']: `${size}px`,
          }}
        />
      </Host>
    );
  }
}
