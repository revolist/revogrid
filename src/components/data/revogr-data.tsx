import {
  Component,
  Host,
  Watch,
  Element,
  Event,
  Prop,
  VNode,
  EventEmitter,
  h,
} from '@stencil/core';
import { HTMLStencilElement, State } from '@stencil/core/internal';

import ColumnService, { ColumnSource, RowSource } from './columnService';
import { ROW_FOCUSED_CLASS } from '../../utils/consts';

import { getSourceItem } from '../../store/dataSource/data.store';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import RowRenderer from './rowRenderer';
import GroupingRowRenderer from '../../plugins/groupingRow/grouping.row.renderer';
import { isGrouping } from '../../plugins/groupingRow/grouping.service';

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
  /**
   * Additional data to pass to renderer
   * Used in plugins such as vue or react to pass root app entity to cells
   */
  @Prop() additionalData: any;
  @Prop() rowSelectionStore!: Observable<Selection.SelectionStoreState>;
  @Prop() viewportRow!: Observable<RevoGrid.ViewportState>;
  @Prop() viewportCol!: Observable<RevoGrid.ViewportState>;

  @Prop() dimensionRow!: Observable<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() colData!: ColumnSource;
  @Prop() dataStore!: RowSource;
  @Prop() type!: RevoGrid.DimensionRows;

  /**
   * Before each row render
   */
  @Event() beforeRowRender: EventEmitter;
  /**
   * When data render finished for the designated type
   */
  @Event() afterrender: EventEmitter;

  private renderedRows = new Map<number, VNode>();
  private currentRange: Selection.RangeArea | null = null;

  private rangeUnsubscribe: (() => void) | undefined;

  @State() providers: RevoGrid.Providers;

  @Watch('dataStore')
  @Watch('colData')
  onStoreChange() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    // make sure we have correct data, before render
    this.providers = {
      type: this.type,
      data: this.dataStore,
      viewport: this.viewportCol,
      dimension: this.dimensionRow,
      selection: this.rowSelectionStore,
    };

    this.rangeUnsubscribe?.();
    this.rangeUnsubscribe = this.rowSelectionStore.onChange('range', e => {
      // clear prev range
      if (this.currentRange) {
        this.renderedRows.forEach((row, y) => {
          // skip current range
          if (e && y >= e.y && y <= e.y1) {
            return;
          }
          if (
            row &&
            row.$elm$ instanceof HTMLElement &&
            row.$elm$.classList.contains(ROW_FOCUSED_CLASS)
          ) {
            row.$elm$.classList.remove(ROW_FOCUSED_CLASS);
          }
        });
      }

      // apply new range
      if (e) {
        for (let y = e.y; y <= e.y1; y++) {
          const row = this.renderedRows.get(y);
          if (
            row &&
            row.$elm$ instanceof HTMLElement &&
            !row.$elm$.classList.contains(ROW_FOCUSED_CLASS)
          ) {
            row.$elm$.classList.add(ROW_FOCUSED_CLASS);
          }
        }
      }
      this.currentRange = e;
    });
  }

  connectedCallback() {
    this.onStoreChange();
  }

  disconnectedCallback() {
    this.columnService?.destroy();
    this.rangeUnsubscribe?.();
  }

  componentDidRender() {
    this.afterrender.emit({ type: this.type });
  }

  render() {
    this.renderedRows = new Map();
    const rows = this.viewportRow.get('items');
    const cols = this.viewportCol.get('items');
    if (!this.columnService.columns.length || !rows.length || !cols.length) {
      return '';
    }
    const rowsEls: VNode[] = [];

    const depth = this.dataStore.get('groupingDepth');
    const groupingCustomRenderer = this.dataStore.get('groupingCustomRenderer');
    for (let rgRow of rows) {
      const dataItem = getSourceItem(this.dataStore, rgRow.itemIndex);
      /** grouping */
      if (isGrouping(dataItem)) {
        rowsEls.push(
          <GroupingRowRenderer
            {...rgRow}
            index={rgRow.itemIndex}
            model={dataItem}
            groupingCustomRenderer={groupingCustomRenderer}
            hasExpand={this.columnService.hasGrouping}
          />,
        );
        continue;
      }
      /** grouping end */
      const cells: (VNode | string | void)[] = [];
      let rowClass = this.rowClass
        ? this.columnService.getRowClass(rgRow.itemIndex, this.rowClass)
        : '';

      // highlight row if it is in range
      if (
        this.currentRange &&
        rgRow.itemIndex >= this.currentRange.y &&
        rgRow.itemIndex <= this.currentRange.y1
      ) {
        rowClass += ` ${ROW_FOCUSED_CLASS}`;
      }
      for (let rgCol of cols) {
        cells.push(
          <revogr-cell
            additionalData={this.additionalData}
            columnService={this.columnService}
            providers={this.providers}
            depth={this.columnService.hasGrouping ? depth : 0}
            rowIndex={rgRow.itemIndex}
            rowStart={rgRow.start}
            rowEnd={rgRow.end}
            rowSize={rgRow.size}
            colIndex={rgCol.itemIndex}
            colStart={rgCol.start}
            colEnd={rgCol.end}
            colSize={rgCol.size}
          />,
        );
      }
      const row = (
        <RowRenderer
          index={rgRow.itemIndex}
          rowClass={rowClass}
          size={rgRow.size}
          start={rgRow.start}
        >
          {cells}
        </RowRenderer>
      );
      this.beforeRowRender.emit({
        node: row,
        item: rgRow,
        dataItem,
      });
      rowsEls.push(row);
      this.renderedRows.set(rgRow.itemIndex, row);
    }
    return (
      <Host>
        <slot />
        {rowsEls}
      </Host>
    );
  }
}
