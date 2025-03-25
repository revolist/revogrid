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
   * Dimensions
   */
  @Prop() realSize!: number;

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
        contentSize: this.realSize,
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
        contentSize: this.realSize,
        clientSize: this.dimension === 'rgRow' ?  this.element.clientHeight : this.element.clientWidth,
        virtualSize: this.clientSize,
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
      this.realSize,
      this.dimension === 'rgRow' ?  this.element.clientHeight : this.element.clientWidth,
      this.clientSize, // content viewport size
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
