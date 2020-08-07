import {Component, Event, EventEmitter, h, Method, Host, Element} from '@stencil/core';

import {rowsStore as rowDimension, colsStore as colDimension} from '../../store/dimension/dimension.store';
import {DimensionType, ViewPortScrollEvent} from '../../interfaces';

@Component({
  tag: 'revogr-viewport'
})
export class RevogrViewport {
  private verticalScroll!: HTMLDivElement;
  @Element() horizontalScroll: HTMLElement;
  @Event() scrollViewport: EventEmitter<ViewPortScrollEvent>;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    switch (e.dimension) {
      case 'col':
        if (typeof e.coordinate === 'number') {
          this.horizontalScroll.scrollLeft = e.coordinate;
        }
        break;
      case 'row':
        if (typeof e.coordinate === 'number') {
          this.verticalScroll.scrollTop = e.coordinate;
        }
        break;
    }
  }

  @Method()
  async getScroll(dimension: DimensionType): Promise<number> {
    switch (dimension) {
      case 'col':
        return this.horizontalScroll?.scrollLeft || 0;
      case 'row':
        return this.verticalScroll?.scrollTop || 0;
    }
  }

  scrollX(): void {
    this.scrollViewport.emit({
      dimension: 'col',
      coordinate: this.horizontalScroll?.scrollLeft || 0
    });
  }

  scrollY(): void {
    this.scrollViewport.emit({
      dimension: 'row',
      coordinate: this.verticalScroll?.scrollTop || 0
    });
  }

  componentWillLoad(): void {
    let oldValY: number = rowDimension.get('realSize');
    let oldValX: number = colDimension.get('realSize');

    // scroll update if number of rows changed
    rowDimension.onChange('realSize', (newVal: number) => {
      if (newVal < oldValY) {
        this.verticalScroll.scrollLeft += newVal - oldValY;
      }
      oldValY = newVal;
    });

    // scroll update if number of cols changed
    colDimension.onChange('realSize', (newVal: number) => {
      if (newVal < oldValX) {
        this.horizontalScroll.scrollLeft += newVal - oldValX;
      }
      oldValX = newVal;
    });
  }

  render() {
    return <Host onScroll={() => this.scrollX()}>
        <div class='inner-content-table'>
          <div class='header-wrapper'><slot name='header'/></div>
          <div class='vertical-wrapper'>
            <div class='vertical-inner' ref={(el) => {this.verticalScroll = el;}} onScroll={() => this.scrollY()}>
              <div style={{ height: `${rowDimension.get('realSize')}px`, width: `${colDimension.get('realSize')}px` }}>
                <slot name='content'/>
              </div>
            </div>
          </div>
        </div>
      </Host>;
  }
}
