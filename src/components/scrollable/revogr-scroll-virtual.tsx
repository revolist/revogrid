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
  ViewportState,
  DimensionSettingsState,
  ViewPortScrollEvent,
} from '@type';
import { AutohideScrollPlugin } from './autohide-scroll.plugin';
import { LocalScrollTimer } from '../../services/local.scroll.timer';
import { type Observable, getScrollbarSize } from '../../utils';

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
   * Viewport
   */
  @Prop() viewportStore!: Observable<ViewportState>;
  /**
   * Dimensions
   */
  @Prop() dimensionStore!: Observable<DimensionSettingsState>;

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
        contentSize: this.dimensionStore.get('realSize'),
        virtualSize: this.viewportStore.get('virtualSize'),
      });
    }
  }

  /**
   * Update if `delta` exists in case we don't know current position or if it's external change
   */
  @Method()
  async changeScroll(e: ViewPortScrollEvent): Promise<ViewPortScrollEvent> {
    if (e.delta) {
      switch (e.dimension) {
        case 'rgCol':
          e.coordinate = this.element.scrollLeft + e.delta;
          break;
        case 'rgRow':
          e.coordinate = this.element.scrollTop + e.delta;
          break;
      }
      this.setScroll(e);
    }
    return e;
  }

  set size(s: number) {
    this.autohideScrollPlugin.setScrollSize(s);
    if (this.dimension === 'rgRow') {
      this.element.style.minWidth = `${s}px`;
      return;
    }
    this.element.style.minHeight = `${s}px`;
  }

  get size(): number {
    if (this.dimension === 'rgRow') {
      return this.element.clientHeight;
    }
    return this.element.clientWidth;
  }

  connectedCallback() {
    this.autohideScrollPlugin = new AutohideScrollPlugin(this.element);
    this.localScrollTimer = new LocalScrollTimer(
      'ontouchstart' in document.documentElement ? 0 : 10,
    );
    this.localScrollService = new LocalScrollService({
      runScroll: e => this.scrollVirtual.emit(e),
      applyScroll: e => {
        this.localScrollTimer.setCoordinate(e);
        const type = e.dimension === 'rgRow' ? 'scrollTop' : 'scrollLeft';
        // this will trigger on scroll event
        this.element[type] = e.coordinate;
      },
    });
  }

  disconnectedCallback() {
    this.autohideScrollPlugin.clear();
  }

  componentWillLoad() {
    this.scrollSize = getScrollbarSize(document);
  }

  componentDidRender() {
    const type = this.dimension === 'rgRow' ? 'scrollHeight' : 'scrollWidth';
    // Get scrollbar size once during component initialization
    const scrollbarSize = this.scrollSize;
    // Calculate if content exceeds viewport size
    // Add scrollbar size to the comparison to account for other dimension's scrollbar
    const hasScroll = this.element[type] > this.size + scrollbarSize;
    // Set scroll size based on whether scroll is needed
    this.size = hasScroll ? this.scrollSize : 0;

    this.localScrollService.setParams(
      {
        contentSize: this.dimensionStore.get('realSize'),
        // Add scrollbar size to clientSize if other dimension has scroll
        clientSize: this.size + (this.dimension === 'rgRow' ? 
          (this.element.scrollWidth > this.element.clientWidth ? scrollbarSize : 0) :
          (this.element.scrollHeight > this.element.clientHeight ? scrollbarSize : 0)
        ),
        virtualSize: this.viewportStore.get('clientSize'),
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
    // apply after throttling
    if (this.localScrollTimer.isReady(this.dimension, target[type] || 0)) {
      this.localScrollService?.scroll(target[type] || 0, this.dimension);
    }
  }

  render() {
    const sizeType = this.dimension === 'rgRow' ? 'height' : 'width';
    const size = getContentSize(
      this.dimensionStore.get('realSize'),
      this.size,
      this.viewportStore.get('clientSize'), // content viewport size
    );
    return (
      <Host onScroll={(e: MouseEvent) => this.onScroll(e)}>
        <div
          style={{
            [sizeType]: `${size}px`,
          }}
        />
      </Host>
    );
  }
}
