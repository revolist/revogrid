import {Component, Element, Event, EventEmitter, h, Prop, Watch} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';

import {DATA_COL, HEADER_CLASS} from '../../utils/consts';
import HeaderService from './headerService';
import {RevoGrid} from "../../interfaces";

@Component({
  tag: 'revogr-header'
})
export class RevogrHeaderComponent {
  @Element() element!: HTMLStencilElement;
  @Prop() canResize: boolean;
  @Prop() cols: RevoGrid.VirtualPositionItem[];
  @Prop() parent: string = '';

  @Event() headerClick: EventEmitter<RevoGrid.ColumnDataSchemaRegular>;
  @Event() headerResize: EventEmitter<RevoGrid.ViewSettingSizeProp>;


  @Prop() colData: RevoGrid.ColumnDataSchemaRegular[];
  @Watch('colData') colChanged(newData: RevoGrid.ColumnDataSchemaRegular[]): void {
    this.headerService.columns = newData;
  }
  private headerService: HeaderService;

  connectedCallback(): void {
    this.headerService = new HeaderService(
        `${this.parent} .${HEADER_CLASS}`,
        this.colData,
        {
          canResize: this.canResize,
          resize: (sizes: RevoGrid.ViewSettingSizeProp) => this.headerResize.emit(sizes)
        }
    );
  }

  disconnectedCallback(): void {
    this.headerService?.destroy();
  }

  render() {
    const cells:HTMLElement[] = [];
    for (let col of this.cols) {
      const dataProps = {
        [DATA_COL]: col.itemIndex,
        class: HEADER_CLASS,
        style: { width: `${col.size}px`, transform: `translateX(${col.start}px)` },
        onClick: () => this.headerClick.emit(this.colData[col.itemIndex])
      };
      cells.push(<div {...dataProps}>{this.colData[col.itemIndex].name}</div>);
    }
    return cells;
  }
}
