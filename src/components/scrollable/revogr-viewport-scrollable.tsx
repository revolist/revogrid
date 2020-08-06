import {Component, h, Method} from '@stencil/core';

import {getScrollbarWidth} from '../../utils/utils';
import {setViewPortCoordinate} from '../../store/viewPort/viewport.store';
import {rowsStore as rowDimension, colsStore as colDimension, getCurrentState} from '../../store/dimension/dimension.store';
import {DimensionSettingsState} from '../../interfaces';

@Component({
  tag: 'revogr-viewport-scrollable'
})
export class RevogrViewportScrollable {
  private verticalScroll!: HTMLDivElement;
  private horizontalScroll!: HTMLDivElement;
  private verticalVirtScroll!: HTMLDivElement;
  private header!: HTMLDivElement;
  private scrollSize: number = 0;
  private preventArtificialScroll: boolean = false;

  @Method()
  async scrollX(x?: number): Promise<void> {
    if (x) {
      this.horizontalScroll.scrollLeft = x;
    }

    const dimension: DimensionSettingsState = getCurrentState('col');
    setViewPortCoordinate(x || this.horizontalScroll?.scrollLeft || 0, 'col', dimension);
  }

  @Method()
  async scrollY(y?: number): Promise<void> {
    if (this.preventArtificialScroll) {
      this.preventArtificialScroll = false;
      return;
    }
    const top: number = y || this.verticalScroll?.scrollTop || 0;
    const dimension: DimensionSettingsState = getCurrentState('row');
    setViewPortCoordinate(top, 'row', dimension);
    if (this.verticalVirtScroll) {
      this.preventArtificialScroll = true;
      this.verticalVirtScroll.scrollTop = top;
    }
  }

  private scrollVirtY = (): void => {
    if (this.preventArtificialScroll) {
      this.preventArtificialScroll = false;
      return;
    }
    const target: HTMLElement|undefined = this.verticalVirtScroll;
    const top: number = target?.scrollTop || 0;
    const dimension: DimensionSettingsState = getCurrentState('row');
    setViewPortCoordinate( top, 'row', dimension);
    if (this.verticalScroll) {
      this.preventArtificialScroll = true;
      this.verticalScroll.scrollTop = top;
    }
  };

  componentWillLoad(): void {
    this.scrollSize = getScrollbarWidth(document);
    let oldValY: number = rowDimension.get('realSize');
    let oldValX: number = colDimension.get('realSize');

    this.scrollX();
    this.scrollY();

    rowDimension.onChange('realSize', (newVal: number) => {
      if (newVal < oldValY) {
        this.verticalScroll.scrollLeft += newVal - oldValY;
      }
      oldValY = newVal;
    });
    colDimension.onChange('realSize', (newVal: number) => {
      if (newVal < oldValX) {
        this.horizontalScroll.scrollLeft += newVal - oldValX;
      }
      oldValX = newVal;
    });
  }

  componentDidRender(): void {
    // has vertical scroll
    if (this.verticalVirtScroll.scrollHeight > this.verticalVirtScroll.clientHeight) {
      const scrollSize: number = this.scrollSize || 20;
      this.verticalVirtScroll.style.top = `${this.header.clientHeight}px`;
      this.verticalVirtScroll.style.width = `${scrollSize}px`;
      this.verticalScroll.style.marginRight = `${scrollSize}px`;
    } else {
      this.verticalVirtScroll.style.width = '0';
      this.verticalScroll.style.marginRight = '0';
    }

    // has horizontal scroll
    if (this.horizontalScroll.scrollWidth > this.horizontalScroll.clientWidth) {
      this.verticalVirtScroll.style.bottom = `${this.scrollSize}px`;
    } else {
      this.verticalVirtScroll.style.bottom = '0';
    }
  }

  render() {
    return [
      <div class='vertical-scroll' ref={(el) => { this.verticalVirtScroll = el; }} onScroll={() => this.scrollVirtY()}>
        <div style={{height: `${rowDimension.get('realSize')}px`}}/>
      </div>,
      <div class='horizontal-wrapper' ref={(el) => { this.horizontalScroll = el; }} onScroll={() => this.scrollX()}>
        <div class='inner-content-table'>

          <div class='header-wrapper' ref={(el) => { this.header = el; }}>
            <slot name='header'/>
          </div>

          <div class='vertical-wrapper'>
            <div class='vertical-inner' ref={(el) => {this.verticalScroll = el;}} onScroll={() => this.scrollY()}>
              <div style={{ height: `${rowDimension.get('realSize')}px`, width: `${colDimension.get('realSize')}px` }}>
                <slot name='content'/>
              </div>
            </div>
          </div>
        </div>
      </div>
    ];
  }
}
