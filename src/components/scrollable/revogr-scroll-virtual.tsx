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
import LocalScrollService, { getContentSize } from '../../services/local.scroll.service';
import { getScrollbarSize } from '../../utils';
import { DimensionType } from '../../types/dimension';
import {
  Observable,
  ViewportState,
  DimensionSettingsState,
  ViewPortScrollEvent,
} from '../../types/interfaces';
import { AutohideScrollPlugin } from './autohide-scroll.plugin';

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
  private autohideScrollPlugin = new AutohideScrollPlugin();
  private scrollSize = 0;
  private scrollService: LocalScrollService;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    if (this.dimension !== e.dimension) {
      return;
    }
    this.scrollService?.setScroll(e);
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
    if (!s) {
      this.element.classList.add('hidden-scroll');
    } else {
      this.element.classList.remove('hidden-scroll');
    }
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
    this.scrollService = new LocalScrollService({
      beforeScroll: e => this.scrollVirtual.emit(e),
      afterScroll: e => {
        const type = e.dimension === 'rgRow' ? 'scrollTop' : 'scrollLeft';
        this.element[type] = e.coordinate;
      },
    });
  }

  disconnectedCallback() {
    this.autohideScrollPlugin.clear();
  }

  componentWillLoad() {
    this.scrollSize = getScrollbarSize(this.element.ownerDocument);
  }

  componentDidRender() {
    const type = this.dimension === 'rgRow' ? 'scrollHeight' : 'scrollWidth';
    if (this.element[type] > this.size) {
      this.size = this.scrollSize;
    } else {
      this.size = 0;
    }
    this.scrollService.setParams(
      {
        contentSize: this.dimensionStore.get('realSize'),
        clientSize: this.size,
        virtualSize: this.viewportStore.get('virtualSize'),
      },
      this.dimension,
    );
  }

  onScroll(e: MouseEvent) {
    let type: 'scrollLeft' | 'scrollTop' = 'scrollLeft';
    if (this.dimension === 'rgRow') {
      type = 'scrollTop';
    }
    this.autohideScrollPlugin.scroll({
      element: this.element,
      scrollSize: this.scrollSize,
      contentSize: this.dimensionStore.get('realSize'),
      virtualSize: this.viewportStore.get('virtualSize'),
    });
    if (!(e.target instanceof Element)) {
      return;
    }
    const target = e.target;
    this.scrollService?.scroll(target[type] || 0, this.dimension);
  }

  render() {
    const sizeType = this.dimension === 'rgRow' ? 'height' : 'width';
    return (
      <Host onScroll={(e: MouseEvent) => this.onScroll(e)}>
        <div
          style={{
            [sizeType]: `${
              getContentSize(
                this.dimensionStore.get('realSize'),
                this.size,
                this.viewportStore.get('virtualSize')
              )}px`,
          }}
        />
      </Host>
    );
  }
}
