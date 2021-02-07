import { Component, Element, Event, Prop, VNode, EventEmitter, h } from '@stencil/core';
import { HTMLStencilElement } from '@stencil/core/internal';

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

  connectedCallback() {
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

    const depth = this.dataStore.get('groupingDepth');
    for (let row of rows) {
      const dataRow = getSourceItem(this.dataStore, row.itemIndex);
      /** grouping */
      if (isGrouping(dataRow)) {
        rowsEls.push(<GroupingRowRenderer {...row} model={dataRow} hasExpand={this.columnService.hasGrouping} />);
        continue;
      }
      /** grouping end */

      const cells: (VNode | string | void)[] = [];
      let rowClass = this.rowClass ? this.columnService.getRowClass(row.itemIndex, this.rowClass) : '';
      if (range && row.itemIndex >= range.y && row.itemIndex <= range.y1) {
        rowClass += ' focused-row';
      }
      for (let col of cols) {
        cells.push(this.getCellRenderer(row, col, this.canDrag, /** grouping apply*/ this.columnService.hasGrouping ? depth : 0));
      }
      rowsEls.push(
        <RowRenderer rowClass={rowClass} size={row.size} start={row.start}>
          {cells}
        </RowRenderer>,
      );
    }
    return rowsEls;
  }

  private getCellRenderer(row: RevoGrid.VirtualPositionItem, col: RevoGrid.VirtualPositionItem, draggable = false, depth = 0) {
    const model = this.columnService.rowDataModel(row.itemIndex, col.itemIndex);
    const defaultProps: RevoGrid.CellProps = {
      [DATA_COL]: col.itemIndex,
      [DATA_ROW]: row.itemIndex,
      style: {
        width: `${col.size}px`,
        transform: `translateX(${col.start}px)`,
      },
    };
    if (depth && !col.itemIndex) {
      defaultProps.style.paddingLeft = `${PADDING_DEPTH * depth}px`;
    }
    const props = this.columnService.mergeProperties(row.itemIndex, col.itemIndex, defaultProps);
    const custom = this.columnService.customRenderer(row.itemIndex, col.itemIndex, model);

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
