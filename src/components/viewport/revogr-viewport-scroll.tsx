import {Component, Event, EventEmitter, h, Method, Element, Prop} from '@stencil/core';
import each from 'lodash/each';

import {DimensionType, ViewPortResizeEvent, ViewPortScrollEvent} from '../../interfaces';
import GridResizeService from './gridResizeService';
import LocalScrollService from "../../services/localScrollService";

@Component({
  tag: 'revogr-viewport-scroll'
})
export class RevogrViewportScroll {
  @Event() scrollViewport: EventEmitter<ViewPortScrollEvent>;
  @Event() resizeViewport: EventEmitter<ViewPortResizeEvent>;


  @Prop() contentWidth: number = 0;
  @Prop() contentHeight: number = 0;

  private oldValY: number = this.contentHeight;
  private oldValX: number = this.contentWidth;
  @Element() horizontalScroll: HTMLElement;
  private verticalScroll: HTMLElement;

  private horizontalMouseWheel: (e: WheelEvent) => void;
  private verticalMouseWheel: (e: WheelEvent) => void;

  private gridResizeService: GridResizeService;
  private scrollService: LocalScrollService;

  @Method()
  async setScroll(e: ViewPortScrollEvent): Promise<void> {
    switch (e.dimension) {
      case 'col':
        this.scrollService?.setScroll(this.horizontalScroll, e);
        break;
      case 'row':
        this.scrollService?.setScroll(this.verticalScroll, e);
        break;
    }
  }


  connectedCallback(): void {
    this.scrollService = new LocalScrollService({
      scroll: e => this.scrollViewport.emit(e)
    });
  }

  componentDidLoad(): void {
    this.verticalMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.scrollService?.scroll(this.verticalScroll.scrollTop + e.deltaY, 'row');
    };
    this.horizontalMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.scrollService?.scroll(this.horizontalScroll.scrollLeft + e.deltaX, 'col');
    };
    this.gridResizeService = new GridResizeService(
        this.horizontalScroll,
        {
          resize: () => {
            const els = {row: this.verticalScroll.clientHeight, col: this.horizontalScroll.clientWidth};
            each(els, (size: number, dimension: DimensionType) => {
              this.resizeViewport.emit({ dimension, size });
              this.scrollService?.scroll(0, dimension, true);
            });
          }
        }
    );
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

    this.scrollService.setParams({
      contentSize: this.contentHeight,
      clientSize: this.verticalScroll.clientHeight,
      virtualSize: 0
    }, 'row');

    this.scrollService.setParams({
      contentSize: this.contentWidth,
      clientSize: this.horizontalScroll.clientWidth,
      virtualSize: 0
    }, 'col');
  }

  render() {
    return <div class='inner-content-table' style={{ width: `${this.contentWidth}px` }}>
            <div class='header-wrapper'>
              <slot name='header'/>
            </div>
            <div class='vertical-inner' ref={el => {this.verticalScroll = el;}}>
              <div class='content-wrapper' style={{ height: `${this.contentHeight}px`,  }}>
                <slot name='content'/>
              </div>
            </div>
            <div class='footer-wrapper'>
              <slot name='footer'/>
            </div>
    </div>;
  }
}
