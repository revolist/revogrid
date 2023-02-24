import { Component, Element, Event, Prop, VNode, EventEmitter, h } from '@stencil/core';
import { HTMLStencilElement, Watch } from '@stencil/core/internal';

import ColumnService, { ColumnSource, RowSource } from './columnService';
import { DATA_COL, DATA_ROW } from '../../utils/consts';

import { getSourceItem } from '../../store/dataSource/data.store';
import { BeforeCellRenderEvent, DragStartEvent, Observable, RevoGrid, Selection } from '../../interfaces';
import CellRenderer from './cellRenderer';
import RowRenderer, { PADDING_DEPTH } from './rowRenderer';
import GroupingRowRenderer from '../../plugins/groupingRow/grouping.row.renderer';
import { isGrouping } from '../../plugins/groupingRow/grouping.service';

const DRAG_START_EVENT = 'dragStartCell';

/**
 * This component is responsible for rendering data
 * Rows, columns, groups and cells
 */
@Component({
  tag: 'revogr-data',
  styleUrl: 'revogr-data-style.scss',
})
export class RevogrData {
  private columnService: ColumnService;

  @Element() element!: HTMLStencilElement;

  /**
   * If readonly mode enables
   */
  @Prop() readonly: boolean;
  /**
   * Range selection mode
  */
  @Prop() range: boolean;

  /**
   * Defines property from which to read row class
   */
  @Prop() rowClass: string;
  /** Additional data to pass to renderer */
  @Prop() additionalData: any;
  @Prop() rowSelectionStore!: Observable<Selection.SelectionStoreState>;
  @Prop() viewportRow!: Observable<RevoGrid.ViewportState>;
  @Prop() viewportCol!: Observable<RevoGrid.ViewportState>;

  @Prop() dimensionRow!: Observable<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() colData!: ColumnSource;
  @Prop() dataStore!: RowSource;
  @Prop() type!: RevoGrid.DimensionRows;

  @Event({ eventName: DRAG_START_EVENT }) dragStartCell: EventEmitter<DragStartEvent>;
  @Event() beforeRowRender: EventEmitter;
  @Event({ eventName: 'before-cell-render' }) beforeCellRender: EventEmitter<BeforeCellRenderEvent>;

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
      const dataItem = getSourceItem(this.dataStore, rgRow.itemIndex);
      /** grouping */
      if (isGrouping(dataItem)) {
        rowsEls.push(<GroupingRowRenderer {...rgRow} model={dataItem} groupingCustomRenderer={groupingCustomRenderer} hasExpand={this.columnService.hasGrouping} />);
        continue;
      }
      /** grouping end */
      const cells: (VNode | string | void)[] = [];
      let rowClass = this.rowClass ? this.columnService.getRowClass(rgRow.itemIndex, this.rowClass) : '';
      if (range && rgRow.itemIndex >= range.y && rgRow.itemIndex <= range.y1) {
        rowClass += ' focused-rgRow';
      }
      for (let rgCol of cols) {
        cells.push(
          this.getCellRenderer(
            rgRow, rgCol,
            /** grouping apply*/ this.columnService.hasGrouping ? depth : 0
          )
        );
      }
      const row = <RowRenderer rowClass={rowClass} size={rgRow.size} start={rgRow.start}>
        {cells}
      </RowRenderer>;
      this.beforeRowRender.emit({
        node: row,
        item: rgRow,
        dataItem
      });
      rowsEls.push(row);
    }
    return rowsEls;
  }

  private getCellRenderer(rgRow: RevoGrid.VirtualPositionItem, rgCol: RevoGrid.VirtualPositionItem, depth = 0) {
    const model = this.columnService.rowDataModel(rgRow.itemIndex, rgCol.itemIndex);
    const cellEvent = this.beforeCellRender.emit({
      column: { ...rgCol },
      row: {
        ...rgRow,
        size: undefined
      },
      model,
      rowType: this.type,
      colType: this.columnService.type,
    });
    if (cellEvent.defaultPrevented) {
      return;
    }
    const {
      detail: {
        column: columnProps,
        row: rowProps
      }
    } = cellEvent;
    const defaultProps: RevoGrid.CellProps = {
      [DATA_COL]: columnProps.itemIndex,
      [DATA_ROW]: rowProps.itemIndex,
      style: {
        width: `${columnProps.size}px`,
        transform: `translateX(${columnProps.start}px)`,
        height: rowProps.size ? `${rowProps.size}px` : undefined,
      },
    };
    /**
     * For grouping, can be removed in the future and replaced with event
     */
    if (depth && !columnProps.itemIndex) {
      defaultProps.style.paddingLeft = `${PADDING_DEPTH * depth}px`;
    }
    const props = this.columnService.mergeProperties(rowProps.itemIndex, columnProps.itemIndex, defaultProps);
    const custom = this.columnService.customRenderer(
      columnProps.itemIndex, model, this.providers, this.additionalData
    );

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
        <CellRenderer model={model} onDragStart={e => this.dragStartCell.emit(e)} />
      </div>
    );
  }

  get providers(): RevoGrid.Providers {
    return {
      type: this.type,
      data: this.dataStore,
      viewport: this.viewportCol,
      dimension: this.dimensionRow,
      selection: this.rowSelectionStore,
    };
  }
}
