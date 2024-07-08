import { Component, Element, Event, Prop, VNode, EventEmitter, h } from '@stencil/core';
import { HTMLStencilElement, Watch } from '@stencil/core/internal';

import ColumnService, { ColumnSource, RowSource } from './columnService';
import { DATA_COL, DATA_ROW } from '../../utils/consts';

import { getSourceItem } from '../../store/dataSource/data.store';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import CellRenderer from './cellRenderer';
import RowRenderer, { PADDING_DEPTH } from './rowRenderer';
import GroupingRowRenderer from '../../plugins/groupingRow/grouping.row.renderer';
import { isGrouping } from '../../plugins/groupingRow/grouping.service';

@Component({
  tag: 'revogr-data',
  styleUrl: 'revogr-data-style.scss',
})
export class RevogrData {
  private columnService: ColumnService;

  @Element() element!: HTMLStencilElement;

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;

  @Prop() rowClass: string;
  @Prop() rowSelectionStore: Observable<Selection.SelectionStoreState>;
  @Prop() viewportRow: Observable<RevoGrid.ViewportState>;
  @Prop() viewportCol: Observable<RevoGrid.ViewportState>;

  @Prop() dimensionRow: Observable<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() colData: ColumnSource;
  @Prop() dataStore: RowSource;

  @Event() dragStartCell: EventEmitter<MouseEvent>;
  @Event() beforerowrender: EventEmitter<{ row: VNode; rowIndex: number; model: any }>;

  @Watch('dataStore')
  @Watch('colData')
  onStoreChange() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
  }

  connectedCallback() {
    this.onStoreChange();
  }

  disconnectedCallback() {
    this.columnService?.destroy();
  }

  render() {
    const rows = this.viewportRow.get('items');
    const cols = this.viewportCol.get('items');
    if (!this.columnService.columns.length || !rows.length || !cols.length) {
      return '';
    }
    const range = this.rowSelectionStore?.get('range');
    const rowsEls: VNode[] = [];

    const depth = this.dataStore.get('groupingDepth');
    const groupingCustomRenderer = this.dataStore.get('groupingCustomRenderer');
    for (let rgRow of rows) {
      const dataRow = getSourceItem(this.dataStore, rgRow.itemIndex);
      /** grouping */
      if (isGrouping(dataRow)) {
        rowsEls.push(<GroupingRowRenderer {...rgRow} model={dataRow} groupingCustomRenderer={groupingCustomRenderer} hasExpand={this.columnService.hasGrouping} />);
        continue;
      }
      /** grouping end */

      const cells: (VNode | string | void)[] = [];
      let rowClass = this.rowClass ? this.columnService.getRowClass(rgRow.itemIndex, this.rowClass) : '';
      if (range && rgRow.itemIndex >= range.y && rgRow.itemIndex <= range.y1) {
        rowClass += ' focused-rgRow';
      }
      for (let rgCol of cols) {
        cells.push(this.getCellRenderer(rgRow, rgCol, this.canDrag, /** grouping apply*/ this.columnService.hasGrouping ? depth : 0));
      }
      const row = <RowRenderer rowClass={rowClass} size={rgRow.size} start={rgRow.start}>
        {cells}
      </RowRenderer>;
      this.beforerowrender.emit({ row, model: dataRow, rowIndex: rgRow.itemIndex });
      rowsEls.push(row);
    }
    return rowsEls;
  }

  private getCellRenderer(rgRow: RevoGrid.VirtualPositionItem, rgCol: RevoGrid.VirtualPositionItem, draggable = false, depth = 0) {
    const model = this.columnService.rowDataModel(rgRow.itemIndex, rgCol.itemIndex);
    const defaultProps: RevoGrid.CellProps = {
      [DATA_COL]: rgCol.itemIndex,
      [DATA_ROW]: rgRow.itemIndex,
      style: {
        width: `${rgCol.size}px`,
        transform: `translateX(${rgCol.start}px)`,
      },
    };
    if (depth && !rgCol.itemIndex) {
      defaultProps.style.paddingLeft = `${PADDING_DEPTH * depth}px`;
    }
    const props = this.columnService.mergeProperties(rgRow.itemIndex, rgCol.itemIndex, defaultProps);
    const custom = this.columnService.customRenderer(rgRow.itemIndex, rgCol.itemIndex, model);

    // if custom render
    if (typeof custom !== 'undefined') {
      return <div {...props}>{custom}</div>;
    }

    // something is wrong with data
    if (!model.column) {
      console.error('Investigate column problem');
      return;
    }

    // if regular render
    return (
      <div {...props}>
        <CellRenderer model={model} canDrag={draggable} onDragStart={e => this.dragStartCell.emit(e)} />
      </div>
    );
  }
}
