import {Component, Element, Event, Prop, Watch, VNode, EventEmitter, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService from './columnService';
import {DATA_COL, DATA_ROW} from '../../utils/consts';

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

  @Prop() rowClass: string;

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
    const rowsEls: VNode[] = [];
    for (let row of this.rows) {
      const cells: VNode[] = [];
      const rowClass = this.rowClass ? this.columnService.getRowClass(row.itemIndex, this.rowClass) : '';
      for (let col of this.cols) {
        cells.push(this.getCellRenderer(row, col));
      }
      rowsEls.push(<div class={`row ${rowClass}`} style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return rowsEls;
  }

  private getCellRenderer(row: RevoGrid.VirtualPositionItem, col: RevoGrid.VirtualPositionItem): VNode {
    const defaultProps: RevoGrid.CellProps = {
      [DATA_COL]: col.itemIndex,
      [DATA_ROW]: row.itemIndex,
      style: {
        width: `${col.size}px`,
        transform: `translateX(${col.start}px)`
      }
    };
    const props = this.columnService.cellProperties(row.itemIndex, col.itemIndex, defaultProps);
    const custom = this.columnService.customRenderer(row.itemIndex, col.itemIndex);
    if (custom) {
      return <div {...props}>{custom}</div>;
    }
    return <div {...props}>
      <CellRenderer
        model={this.columnService.rowDataModel(row.itemIndex, col.itemIndex)}
        canDrag={this.canDrag}
        onDragStart={(e) => this.dragStartCell.emit(e)}/>
    </div>;
  }
}
