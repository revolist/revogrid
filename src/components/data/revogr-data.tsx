import {Component, Element, Event, Prop, VNode, EventEmitter, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService from './columnService';
import {DATA_COL, DATA_ROW} from '../../utils/consts';

import {DataSourceState} from '../../store/dataSource/data.store';
import {RevoGrid, Selection} from '../../interfaces';
import CellRenderer from './cellRenderer';

@Component({
  tag: 'revogr-data',
  styleUrl: 'revogr-data-style.scss'
})
export class RevogrData {
  private columnService: ColumnService;

  @Element() element!: HTMLStencilElement;

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;

  @Prop() rowClass: string;

  @Prop() colData: ObservableMap<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
  @Prop() rowSelectionStore: ObservableMap<Selection.SelectionStoreState>;
  @Prop() viewportRow: ObservableMap<RevoGrid.ViewportState>;
  @Prop() viewportCol:  ObservableMap<RevoGrid.ViewportState>;

  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  @Event() dragStartCell: EventEmitter<MouseEvent>;

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
  }

  render() {
    const rows = this.viewportRow.get('items');
    const cols = this.viewportCol.get('items');
    if (!this.columnService.columns.length || !rows.length || !cols.length) {
      return '';
    }
    const range = this.rowSelectionStore?.get('range');
    const rowsEls: VNode[] = [];
    for (let row of rows) {
      const cells: (VNode|string|void)[] = [];
      let rowClass = this.rowClass ? this.columnService.getRowClass(row.itemIndex, this.rowClass) : '';
      if (range && row.itemIndex >= range.y && row.itemIndex <= range.y1) {
        rowClass += ' focused-row';
      }
      for (let col of cols) {
        cells.push(this.getCellRenderer(row, col));
      }
      rowsEls.push(<div class={`row ${rowClass}`} style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return rowsEls;
  }
  
  private getCellRenderer(row: RevoGrid.VirtualPositionItem, col: RevoGrid.VirtualPositionItem): VNode|string|void {
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
    if (typeof custom !== 'undefined') {
      return <div {...props}>{custom}</div>;
    }
    const model = this.columnService.rowDataModel(row.itemIndex, col.itemIndex);
    if (!model.column) {
      console.error('Investigate column problem');
      return;
    }
    return <div {...props}>
      <CellRenderer
        model={model}
        canDrag={this.canDrag}
        onDragStart={(e) => this.dragStartCell.emit(e)}/>
    </div>;
  }
}
