import {Component, Event, EventEmitter, h, Method, Host, Element, Prop} from '@stencil/core';

import {DimensionType, ViewPortResizeEvent, ViewPortScrollEvent} from '../../interfaces';
import moduleRegister from '../../services/moduleRegister';
import GridResizeService from './gridResizeService';

@Component({
  tag: 'revogr-viewport'
})
export class RevogrViewport {
  @Element() horizontalScroll: HTMLElement;
  @Event() scrollViewport: EventEmitter<ViewPortScrollEvent>;
  @Event() resizeViewport: EventEmitter<ViewPortResizeEvent>;


  @Prop() contentWidth: number = 0;
  @Prop() contentHeight: number = 0;

  private preventArtificialScroll: {[T in DimensionType]: boolean} = { row: false, col: false };
  private scrollCoordinates: {[T in DimensionType]: number} = {row: 0, col: 0};
  private oldValY: number = this.contentHeight;
  private oldValX: number = this.contentWidth;
  private verticalScroll: HTMLDivElement;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    window.requestAnimationFrame(() => {
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
      this.preventArtificialScroll[e.dimension] = true;
    });
  }

  scroll(dimension: DimensionType, coordinate: number = 0): void {
    this.scrollCoordinates[dimension] = coordinate;
    if (this.preventArtificialScroll[dimension]) {
      this.preventArtificialScroll[dimension] = false;
      return;
    }
    this.scrollViewport.emit({
      dimension: dimension,
      coordinate: this.scrollCoordinates[dimension]
    });
  }

  componentDidLoad(): void {
    moduleRegister.register('resize', new GridResizeService(this.horizontalScroll, {
      resize: (dimension: DimensionType, size: number) => {
        this.resizeViewport.emit({ dimension, size });
        this.scroll(dimension);
      }
    }));
    this.verticalScroll.addEventListener('mousewheel', (e: WheelEvent) => {
      e.preventDefault();
      this.scroll('row', this.verticalScroll.scrollTop + e.deltaY);
    });
    this.horizontalScroll.addEventListener('mousewheel', (e: WheelEvent) => {
      e.preventDefault();
      this.scroll('col', this.horizontalScroll.scrollLeft + e.deltaX);
    });
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
    return <Host>
        <div class='inner-content-table'>
          <div class='header-wrapper'><slot name='header'/></div>
          <div class='vertical-wrapper'>
            <div class='vertical-inner' ref={el => {this.verticalScroll = el;}}>
              <div style={{ height: `${this.contentHeight}px`, width: `${this.contentWidth}px` }}>
                <slot name='content'/>
              </div>
            </div>
          </div>
        </div>
      </Host>;
  }
}
