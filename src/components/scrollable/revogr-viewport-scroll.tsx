import {Component, Event, EventEmitter, h, Method, Element, Prop} from '@stencil/core';

import {DimensionType, ViewPortResizeEvent, ViewPortScrollEvent} from '../../interfaces';
import GridResizeService from './gridResizeService';

@Component({
  tag: 'revogr-viewport-scroll'
})
export class RevogrViewportScroll {
  @Element() horizontalScroll: HTMLElement;
  @Event() scrollViewport: EventEmitter<ViewPortScrollEvent>;
  @Event() resizeViewport: EventEmitter<ViewPortResizeEvent>;


  @Prop() contentWidth: number = 0;
  @Prop() contentHeight: number = 0;

  private preventArtificialScroll: {[T in DimensionType]: number} = { row: 0, col: 0 };
  private scrollCoordinates: {[T in DimensionType]: number} = {row: 0, col: 0};
  private oldValY: number = this.contentHeight;
  private oldValX: number = this.contentWidth;
  private verticalScroll: HTMLDivElement;

  private horizontalMouseWheel: (e: WheelEvent) => void;
  private verticalMouseWheel: (e: WheelEvent) => void;

  private gridResizeService: GridResizeService;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    this.preventArtificialScroll[e.dimension] = window.requestAnimationFrame(() => {
      switch (e.dimension) {
        case 'col':
          if (typeof e.coordinate === 'number') {
            this.horizontalScroll.scrollLeft = e.coordinate;
          }
          break;
        case 'row':
          if (typeof e.coordinate === 'number' && this.verticalScroll) {
            this.verticalScroll.scrollTop = e.coordinate;
          }
          break;
      }
      this.preventArtificialScroll[e.dimension] = 0;
    });
  }

  scroll(dimension: DimensionType, coordinate: number = 0): void {
    this.scrollCoordinates[dimension] = coordinate;
    if (this.preventArtificialScroll[dimension]) {
      window.cancelAnimationFrame(this.preventArtificialScroll[dimension]);
    }
    this.scrollViewport.emit({
      dimension: dimension,
      coordinate: this.scrollCoordinates[dimension]
    });
  }

  componentDidLoad(): void {
    this.verticalMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.scroll('row', this.verticalScroll.scrollTop + e.deltaY);
    };
    this.horizontalMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.scroll('col', this.horizontalScroll.scrollLeft + e.deltaX);
    };
    this.gridResizeService = new GridResizeService(this.horizontalScroll, {
      resize: (dimension: DimensionType, size: number) => {
        this.resizeViewport.emit({ dimension, size });
        this.scroll(dimension);
      }
    });
    this.verticalScroll.addEventListener('mousewheel', this.verticalMouseWheel);
    this.horizontalScroll.addEventListener('mousewheel', this.horizontalMouseWheel);
  }

  disconnectedCallback(): void {
    this.verticalScroll.removeEventListener('mousewheel', this.verticalMouseWheel);
    this.horizontalScroll.removeEventListener('mousewheel', this.horizontalMouseWheel);
    this.gridResizeService.destroy();
  }

  async componentDidRender(): Promise<void> {
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
  }

  render() {
    return <div class='inner-content-table'>
            <div class='header-wrapper' style={{ width: `${this.contentWidth}px` }}><slot name='header'/></div>
            <div class='vertical-inner' ref={el => {this.verticalScroll = el;}} style={{ width: `${this.contentWidth}px` }}>
              <div class='content-wrapper' style={{ height: `${this.contentHeight}px`,  }}>
                <slot name='content'/>
              </div>
            </div>
            <div class='footer-wrapper' style={{ width: `${this.contentWidth}px` }}>
              <slot name='footer'/>
            </div>

    </div>;
  }
}
