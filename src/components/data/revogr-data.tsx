import {Component, Element, h, Host, Prop, Watch} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService from './columnService';
import {CELL_CLASS, DATA_COL, DATA_ROW, DISABLED_CLASS} from '../../utils/consts';

import {DataSourceState} from '../../store/dataSource/data.store';
import {RevoGrid} from "../../interfaces";

@Component({
  tag: 'revogr-data'
})
export class RevogrData {
  private columnService: ColumnService;

  @Element() element!: HTMLStencilElement;
  @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType>>;
  @Prop() colData: RevoGrid.ColumnDataSchemaRegular[];

  @Prop() readonly: boolean;
  @Prop() range: boolean;

  @Prop() rows: RevoGrid.VirtualPositionItem[];
  @Prop() cols: RevoGrid.VirtualPositionItem[];

  @Watch('colData') colChanged(newData: RevoGrid.ColumnDataSchemaRegular[]): void {
    this.columnService.columns = newData;
  }

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
  }

  render() {
    if (!this.colData || !this.rows.length || !this.cols.length) {
      return '';
    }
    const rowsEls: HTMLElement[] = [];
    for (let row of this.rows) {
      const cells: HTMLElement[] = [];
      for (let col of this.cols) {
        const dataProps = {
          [DATA_COL]: col.itemIndex,
          [DATA_ROW]: row.itemIndex,
          class: `${CELL_CLASS} ${this.columnService.isReadOnly(row.itemIndex, col.itemIndex) ? DISABLED_CLASS : ''}`,
          style: {width: `${col.size}px`, transform: `translateX(${col.start}px)`}
        };
        cells.push(<div {...dataProps}>{this.columnService.cellRenderer(row.itemIndex, col.itemIndex)}</div>);
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    if (!this.readonly || this.range) {
        rowsEls.push(<slot name='overlay'/>);
    }
    return <Host>{rowsEls}</Host>;
  }
}
