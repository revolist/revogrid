import { h, VNode } from '@stencil/core';
import { DataSourceState, getSourceItem, getVisibleSourceItem, setSourceByVirtualIndex } from '../../store/dataSource/data.store';
import { CELL_CLASS, DISABLED_CLASS } from '../../utils/consts';
import { Edition, Observable, RevoGrid, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';

import BeforeSaveDataDetails = Edition.BeforeSaveDataDetails;
import ColumnDataSchemaModel = RevoGrid.ColumnDataSchemaModel;
import ColumnProp = RevoGrid.ColumnProp;
import DataType = RevoGrid.DataType;
import { isGroupingColumn } from '../../plugins/groupingRow/grouping.service';

export interface ColumnServiceI {
  columns: RevoGrid.ColumnRegular[];
  customRenderer(r: number, c: number, model: ColumnDataSchemaModel): VNode | string | void;
  isReadOnly(r: number, c: number): boolean;
  getCellData(r: number, c: number): string;
}

export type ColumnSource = Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
export type RowSource = Observable<DataSourceState<DataType, RevoGrid.DimensionRows>>;

export type ColumnStores = {
  [T in RevoGrid.DimensionCols]: ColumnSource;
};
export type RowStores = {
  [T in RevoGrid.DimensionRows]: RowSource;
};

export default class ColumnService implements ColumnServiceI {
  private unsubscribe: { (): void }[] = [];
  get columns(): RevoGrid.ColumnRegular[] {
    return getVisibleSourceItem(this.source);
  }

  hasGrouping = false;

  constructor(private dataStore: RowSource, private source: ColumnSource) {
    this.unsubscribe.push(source.onChange('source', s => this.checkGrouping(s)));
    this.checkGrouping(source.get('source'));
  }

  private checkGrouping(cols: RevoGrid.ColumnRegular[]) {
    for (let col of cols) {
      if (isGroupingColumn(col)) {
        this.hasGrouping = true;
        return;
      }
      this.hasGrouping = false;
    }
  }

  isReadOnly(r: number, c: number): boolean {
    const readOnly: RevoGrid.ReadOnlyFormat = this.columns[c]?.readonly;
    if (typeof readOnly === 'function') {
      const data = this.rowDataModel(r, c);
      return readOnly(data);
    }
    return readOnly;
  }

  static doMerge(existing: RevoGrid.CellProps, extra: RevoGrid.CellProps) {
    let props: RevoGrid.CellProps = { ...extra, ...existing };
    // extend existing props
    if (extra.class) {
      if (typeof extra.class === 'object' && typeof props.class === 'object') {
        props.class = { ...extra.class, ...props.class };
      } else if (typeof extra.class === 'string' && typeof props.class === 'object') {
        props.class[extra.class] = true;
      } else if (typeof props.class === 'string') {
        props.class += ' ' + extra.class;
      }
    }
    if (extra.style) {
      props.style = { ...extra.style, ...props.style };
    }
    return props;
  }

  mergeProperties(r: number, c: number, defaultProps: RevoGrid.CellProps): RevoGrid.CellProps {
    const cellClass: { [key: string]: boolean } = {
      [CELL_CLASS]: true,
      [DISABLED_CLASS]: this.isReadOnly(r, c),
    };
    let props: RevoGrid.CellProps = {
      ...defaultProps,
      class: cellClass,
    };
    const extraPropsFunc = this.columns[c]?.cellProperties;
    if (extraPropsFunc) {
      const data = this.rowDataModel(r, c);
      const extra = extraPropsFunc(data);
      if (!extra) {
        return props;
      }
      return ColumnService.doMerge(props, extra);
    }
    return props;
  }

  customRenderer(_r: number, c: number, model: ColumnDataSchemaModel): VNode | string | void {
    const tpl = this.columns[c]?.cellTemplate;
    if (tpl) {
      return tpl((h as unknown) as RevoGrid.HyperFunc<VNode>, model);
    }
    return;
  }

  getRowClass(r: number, prop: string): string {
    const model: DataType = getSourceItem(this.dataStore, r) || {};
    return model[prop] || '';
  }

  getCellData(r: number, c: number): string {
    const data = this.rowDataModel(r, c);
    return ColumnService.getData(data.model[data.prop as number]);
  }

  getSaveData(rowIndex: number, c: number, val?: string): BeforeSaveDataDetails {
    if (typeof val === 'undefined') {
      val = this.getCellData(rowIndex, c);
    }
    const data = this.rowDataModel(rowIndex, c);
    return {
      prop: data.prop,
      rowIndex,
      val,
      model: data.model,
      type: this.dataStore.get('type'),
    };
  }

  getCellEditor(_r: number, c: number, editors: Edition.Editors): Edition.EditorCtr | undefined {
    const editor = this.columns[c]?.editor;
    if (!editor) {
      return undefined;
    }
    // reference
    if (typeof editor === 'string') {
      return editors[editor];
    }
    return editor;
  }

  rowDataModel(rowIndex: number, c: number): ColumnDataSchemaModel {
    const column = this.columns[c];
    const prop: ColumnProp | undefined = column?.prop;
    const model = getSourceItem(this.dataStore, rowIndex) || {};
    return {
      prop,
      model,
      data: this.dataStore.get('source'),
      column,
      rowIndex,
    };
  }

  getRangeData(d: Selection.ChangedRange): RevoGrid.DataLookup {
    const changed: RevoGrid.DataLookup = {};

    // get original length sizes
    const copyColLength = d.oldProps.length;
    const copyFrom = this.copyRangeArray(d.oldRange, d.oldProps, this.dataStore);
    const copyRowLength = copyFrom.length;

    // rows
    for (let rowIndex = d.newRange.y, i = 0; rowIndex < d.newRange.y1 + 1; rowIndex++, i++) {
      // copy original data link
      const copyRow = copyFrom[i % copyRowLength];

      // columns
      for (let colIndex = d.newRange.x, j = 0; colIndex < d.newRange.x1 + 1; colIndex++, j++) {
        // check if old range area
        if (rowIndex >= d.oldRange.y && rowIndex <= d.oldRange.y1 && colIndex >= d.oldRange.x && colIndex <= d.oldRange.x1) {
          continue;
        }

        const p = this.columns[colIndex].prop;
        const currentCol = j % copyColLength;

        /** if can write */
        if (!this.isReadOnly(rowIndex, colIndex)) {
          /** to show before save */
          if (!changed[rowIndex]) {
            changed[rowIndex] = {};
          }
          changed[rowIndex][p] = copyRow[currentCol];
        }
      }
    }
    return changed;
  }

  getTransformedDataToApply(
    start: Selection.Cell,
    data: RevoGrid.DataFormat[][],
  ): {
    changed: RevoGrid.DataLookup;
    range: Selection.RangeArea;
  } {
    const changed: RevoGrid.DataLookup = {};
    const copyRowLength = data.length;
    const colLength = this.columns.length;
    const rowLength = this.dataStore.get('items').length;
    // rows
    let rowIndex = start.y;
    let maxCol = 0;
    for (let i = 0; rowIndex < rowLength && i < copyRowLength; rowIndex++, i++) {
      // copy original data link
      const copyRow = data[i % copyRowLength];
      const copyColLength = copyRow?.length || 0;
      // columns
      let colIndex = start.x;
      for (let j = 0; colIndex < colLength && j < copyColLength; colIndex++, j++) {
        const p = this.columns[colIndex].prop;
        const currentCol = j % colLength;

        /** if can write */
        if (!this.isReadOnly(rowIndex, colIndex)) {
          /** to show before save */
          if (!changed[rowIndex]) {
            changed[rowIndex] = {};
          }
          changed[rowIndex][p] = copyRow[currentCol];
        }
      }
      maxCol = Math.max(maxCol, colIndex - 1);
    }
    const range = getRange(start, {
      y: rowIndex - 1,
      x: maxCol,
    });
    return {
      changed,
      range,
    };
  }

  applyRangeData(data: RevoGrid.DataLookup) {
    const items: Record<number, DataType> = {};
    for (let rowIndex in data) {
      const oldModel = (items[rowIndex] = getSourceItem(this.dataStore, parseInt(rowIndex, 10)));
      for (let prop in data[rowIndex]) {
        oldModel[prop] = data[rowIndex][prop];
      }
    }
    setSourceByVirtualIndex(this.dataStore, items);
  }

  getRangeStaticData(d: Selection.RangeArea, value: RevoGrid.DataFormat): RevoGrid.DataLookup {
    const changed: RevoGrid.DataLookup = {};

    // rows
    for (let rowIndex = d.y, i = 0; rowIndex < d.y1 + 1; rowIndex++, i++) {
      // columns
      for (let colIndex = d.x, j = 0; colIndex < d.x1 + 1; colIndex++, j++) {
        const p = this.columns[colIndex].prop;

        /** if can write */
        if (!this.isReadOnly(rowIndex, colIndex)) {
          /** to show before save */
          if (!changed[rowIndex]) {
            changed[rowIndex] = {};
          }
          changed[rowIndex][p] = value;
        }
      }
    }
    return changed;
  }

  copyRangeArray(
    range: Selection.RangeArea,
    rangeProps: RevoGrid.ColumnProp[],
    store: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>,
  ): RevoGrid.DataFormat[][] {
    const toCopy: RevoGrid.DataFormat[][] = [];
    for (let i = range.y; i < range.y1 + 1; i++) {
      const row: RevoGrid.DataFormat[] = [];
      for (let prop of rangeProps) {
        const item = getSourceItem(store, i);
        row.push(item[prop]);
      }
      toCopy.push(row);
    }
    return toCopy;
  }

  static getData(val?: any): string {
    if (typeof val === 'undefined' || val === null) {
      return '';
    }
    return val.toString();
  }

  destroy() {
    this.unsubscribe.forEach(f => f());
  }
}
