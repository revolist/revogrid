import { Component, Element, Event, EventEmitter, h, Host, Method, Prop } from '@stencil/core';
import LocalScrollService from '../../services/local.scroll.service';
import { getScrollbarWidth } from '../../utils';
import { DimensionType } from '../../types/dimension';
import { Observable, ViewportState, DimensionSettingsState, ViewPortScrollEvent } from '../../types/interfaces';

@Component({
  tag: 'revogr-scroll-virtual',
  styleUrl: 'revogr-scroll-style.scss',
})
export class RevogrScrollVirtual {
  private scrollSize: number = 0;
  private isAutoHide: boolean = false;
  private autoHideTimeout: number = 0;
  private scrollService: LocalScrollService;

  @Element() element: HTMLElement;

  @Prop() dimension: DimensionType = 'rgRow';
  @Prop() viewportStore: Observable<ViewportState>;
  @Prop() dimensionStore: Observable<DimensionSettingsState>;

  @Event() scrollVirtual: EventEmitter<ViewPortScrollEvent>;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    if (this.dimension !== e.dimension) {
      return;
    }
    this.scrollService?.setScroll(e);
  }

  // update on delta in case we don't know existing position or external change
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

  connectedCallback(): void {
    this.scrollService = new LocalScrollService({
      beforeScroll: e => this.scrollVirtual.emit(e),
      afterScroll: e => {
        const type = e.dimension === 'rgRow' ? 'scrollTop' : 'scrollLeft';
        this.element[type] = e.coordinate;
      },
    });
  }

  disconnectedCallback(): void {
    clearTimeout(this.autoHideTimeout);
  }

  componentWillLoad(): void {
    this.scrollSize = getScrollbarWidth(document);
    this.isAutoHide = !this.scrollSize;
  }

  componentDidRender(): void {
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

  onScroll(e: MouseEvent): void {
    let type: 'scrollLeft' | 'scrollTop' = 'scrollLeft';
    if (this.dimension === 'rgRow') {
      type = 'scrollTop';
    }
    if (this.isAutoHide) {
      this.size = 20;
      this.autoHideTimeout = this.autoHide(this.autoHideTimeout);
    }
    const target: HTMLElement = e.target as HTMLElement;
    this.scrollService?.scroll(target[type] || 0, this.dimension);
  }

  autoHide(timeout?: number): number {
    clearTimeout(timeout);
    return (setTimeout(() => {
      this.size = 0;
    }, 6000) as unknown) as number;
  }

  render() {
    const sizeType = this.dimension === 'rgRow' ? 'height' : 'width';
    return (
      <Host {...{ 'auto-hide': this.isAutoHide }} onScroll={(e: MouseEvent) => this.onScroll(e)}>
        <div style={{ [sizeType]: `${this.extContentSize(this.viewportStore.get('virtualSize'), this.dimensionStore.get('realSize'))}px` }} />
      </Host>
    );
  }

  private extContentSize(vsize: number, contentSize: number): number {
    return LocalScrollService.getVirtualContentSize(contentSize, this.size, vsize);
  }
}
