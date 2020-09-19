import {Component, Element, Event, Prop, Watch, VNode, EventEmitter, h, Host} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService from './columnService';
import {CELL_CLASS, DATA_COL, DATA_ROW, DISABLED_CLASS} from '../../utils/consts';

import {DataSourceState} from '../../store/dataSource/data.store';
import {RevoGrid} from '../../interfaces';
import CellRenderer from './cellRenderer';

@Component({
  tag: 'revogr-data',
  styleUrl: 'revogr-data-style.scss'
})
export class RevogrData {
  private columnService: ColumnService;

  @Element() element!: HTMLStencilElement;
  @Prop() colData: RevoGrid.ColumnRegular[];

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;

  @Prop() rows: RevoGrid.VirtualPositionItem[];
  @Prop() cols: RevoGrid.VirtualPositionItem[];

  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  @Event() dragStartCell: EventEmitter<MouseEvent>;

  @Watch('colData') colChanged(newData: RevoGrid.ColumnRegular[]): void {
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
        cells.push(<div {...dataProps}>{this.getCellRenderer(row.itemIndex, col.itemIndex)}</div>);
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return <Host>{rowsEls}</Host>;
  }

  private getCellRenderer(row: number, col: number): VNode {
    const custom = this.columnService.customRenderer(row, col);
    if (custom) {
      return custom;
    }
    return <CellRenderer
      model={this.columnService.rowDataModel(row, col)}
      canDrag={this.canDrag}
      onDragStart={(e) => this.dragStartCell.emit(e)}/>
  }
}
