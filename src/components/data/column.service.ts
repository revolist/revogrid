import { DSourceState, getSourceItem, getVisibleSourceItem } from '@store';
import { CELL_CLASS, DISABLED_CLASS } from '../../utils/consts';
import { getRange } from '@store';

import { isGroupingColumn } from '../../plugins/groupingRow/grouping.service';
import slice from 'lodash/slice';
import {
  DimensionCols,
  DimensionRows,
  RowDrag,
  ColumnRegular,
  DataType,
  CellProps,
  ColumnDataSchemaModel,
  ColumnProp,
  DataLookup,
  DataFormat,
  ChangedRange,
  OldNewRangeMapping,
  Cell,
  RangeArea,
  BeforeSaveDataDetails,
  EditorCtr,
  Editors,
} from '@type';
import { Observable } from '../../utils/store.utils';

export type ColumnStores = {
  [T in DimensionCols]: Observable<DSourceState<ColumnRegular, DimensionCols>>;
};
export type RowStores = {
  [T in DimensionRows]: Observable<DSourceState<DataType, DimensionRows>>;
};

export default class ColumnService {
  private unsubscribe: { (): void }[] = [];
  get columns(): ColumnRegular[] {
    return getVisibleSourceItem(this.source);
  }

  hasGrouping = false;
  type: DimensionCols;

  constructor(
    private dataStore: Observable<DSourceState<DataType, DimensionRows>>,
    private source: Observable<DSourceState<ColumnRegular, DimensionCols>>,
  ) {
    this.unsubscribe.push(
      source.onChange('source', s => this.checkGrouping(s)),
    );
    this.checkGrouping(source.get('source'));
    this.type = source.get('type');
  }

  private checkGrouping(cols: ColumnRegular[]) {
    for (let rgCol of cols) {
      if (isGroupingColumn(rgCol)) {
        this.hasGrouping = true;
        return;
      }
      this.hasGrouping = false;
    }
  }

  isReadOnly(r: number, c: number) {
    const readOnly = this.columns[c]?.readonly;
    if (typeof readOnly === 'function') {
      const data = this.rowDataModel(r, c);
      return readOnly(data);
    }
    return !!readOnly;
  }

  mergeProperties(
    r: number,
    c: number,
    defaultProps: CellProps,
    model: ColumnDataSchemaModel,
    extraPropsFunc: ColumnRegular['cellProperties'],
  ): CellProps {
    const cellClass: { [key: string]: boolean } = {
      [CELL_CLASS]: true,
      [DISABLED_CLASS]: this.isReadOnly(r, c),
    };
    let props: CellProps = {
      ...defaultProps,
      class: cellClass,
    };
    const extra = extraPropsFunc?.(model);
    if (!extra) {
      return props;
    }
    return doPropMerge(props, extra);
  }

  getRowClass(r: number, prop: string): string {
    const model = getSourceItem(this.dataStore, r) || {};
    return model[prop] || '';
  }

  getCellData(r: number, c: number): string {
    const data = this.rowDataModel(r, c);
    return getCellData(data.model[data.prop as number]);
  }

  getSaveData(
    rowIndex: number,
    colIndex: number,
    val?: string,
  ): BeforeSaveDataDetails {
    if (typeof val === 'undefined') {
      val = this.getCellData(rowIndex, colIndex);
    }
    const data = this.rowDataModel(rowIndex, colIndex);
    return {
      prop: data.prop,
      rowIndex,
      colIndex,
      val,
      model: data.model,
      colType: this.type,
      type: this.dataStore.get('type'),
    };
  }

  getCellEditor(
    _r: number,
    c: number,
    editors: Editors,
  ): EditorCtr | undefined {
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

  /**
   * Get cell data model for given rowIndex and colIndex
   * Used to pass data to editor/renderer
   */
  rowDataModel(rowIndex: number, colIndex: number): ColumnDataSchemaModel {
    const column = this.columns[colIndex];
    const prop: ColumnProp | undefined = column?.prop;
    const model = getSourceItem(this.dataStore, rowIndex) || {};
    const value = model[prop];
    const type = this.dataStore.get('type');
    return {
      prop,
      model,
      data: this.dataStore.get('source'),
      column,
      rowIndex,
      colIndex,
      colType: this.type,
      type,
      value,
    };
  }

  getRangeData(
    d: ChangedRange,
    columns: ColumnRegular[],
  ): {
    changed: DataLookup;
    mapping: OldNewRangeMapping;
  } {
    const changed: DataLookup = {};

    // get original length sizes
    const copyColLength = d.oldRange.x1 - d.oldRange.x + 1;
    const copyRowLength = d.oldRange.y1 - d.oldRange.y + 1;
    const mapping: OldNewRangeMapping = {};

    // rows
    for (
      let rowIndex = d.newRange.y, i = 0;
      rowIndex < d.newRange.y1 + 1;
      rowIndex++, i++
    ) {
      // copy original data link
      const oldRowIndex = d.oldRange.y + (i % copyRowLength);
      const copyRow = getSourceItem(this.dataStore, oldRowIndex) || {};

      // columns
      for (
        let colIndex = d.newRange.x, j = 0;
        colIndex < d.newRange.x1 + 1;
        colIndex++, j++
      ) {
        // check if old range area
        if (
          rowIndex >= d.oldRange.y &&
          rowIndex <= d.oldRange.y1 &&
          colIndex >= d.oldRange.x &&
          colIndex <= d.oldRange.x1
        ) {
          continue;
        }

        // requested column beyond range
        if (!this.columns[colIndex]) {
          continue;
        }
        const prop = this.columns[colIndex]?.prop;
        const copyColIndex = d.oldRange.x + (j % copyColLength);
        const copyColumnProp = columns[copyColIndex].prop;

        /** if can write */
        if (!this.isReadOnly(rowIndex, colIndex)) {
          /** to show before save */
          if (!changed[rowIndex]) {
            changed[rowIndex] = {};
          }
          changed[rowIndex][prop] = copyRow[copyColumnProp];
          /** Generate mapping object */
          if (!mapping[rowIndex]) {
            mapping[rowIndex] = {};
          }
          mapping[rowIndex][prop] = {
            colIndex: copyColIndex,
            colProp: copyColumnProp,
            rowIndex: oldRowIndex,
          };
        }
      }
    }
    return {
      changed,
      mapping,
    };
  }

  getTransformedDataToApply(
    start: Cell,
    data: DataFormat[][],
  ): {
    changed: DataLookup;
    range: RangeArea;
  } {
    const changed: DataLookup = {};
    const copyRowLength = data.length;
    const colLength = this.columns.length;
    const rowLength = this.dataStore.get('items').length;
    // rows
    let rowIndex = start.y;
    let maxCol = 0;
    for (
      let i = 0;
      rowIndex < rowLength && i < copyRowLength;
      rowIndex++, i++
    ) {
      // copy original data link
      const copyRow = data[i % copyRowLength];
      const copyColLength = copyRow?.length || 0;
      // columns
      let colIndex = start.x;
      for (
        let j = 0;
        colIndex < colLength && j < copyColLength;
        colIndex++, j++
      ) {
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

  getRangeStaticData(d: RangeArea, value: DataFormat): DataLookup {
    const changed: DataLookup = {};

    // rows
    for (let rowIndex = d.y, i = 0; rowIndex < d.y1 + 1; rowIndex++, i++) {
      // columns
      for (let colIndex = d.x, j = 0; colIndex < d.x1 + 1; colIndex++, j++) {
        // requested column beyond range
        if (!this.columns[colIndex]) {
          continue;
        }
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

  getRangeTransformedToProps(
    d: RangeArea,
    store: Observable<DSourceState<DataType, DimensionRows>>,
  ) {
    const area: {
      prop: ColumnProp;
      rowIndex: number;
      colIndex: number;
      model: DataType;
      colType: DimensionCols;
      type: DimensionRows;
    }[] = [];

    const type = this.dataStore.get('type');
    // rows
    for (let rowIndex = d.y, i = 0; rowIndex < d.y1 + 1; rowIndex++, i++) {
      // columns
      for (let colIndex = d.x, j = 0; colIndex < d.x1 + 1; colIndex++, j++) {
        const prop = this.columns[colIndex]?.prop;
        area.push({
          prop,
          rowIndex,
          colIndex,
          model: getSourceItem(store, rowIndex),
          type,
          colType: this.type,
        });
      }
    }
    return area;
  }

  copyRangeArray(
    range: RangeArea,
    store: Observable<DSourceState<DataType, DimensionRows>>,
  ) {
    const cols = [...this.columns];
    const props = slice(cols, range.x, range.x1 + 1).map(v => v.prop);
    const toCopy: DataFormat[][] = [];
    const mapping: { [rowIndex: number]: { [colProp: ColumnProp]: any } } = {};

    // rows indexes
    for (let i = range.y; i <= range.y1; i++) {
      const rgRow: DataFormat[] = [];
      mapping[i] = {};

      // columns indexes
      for (let prop of props) {
        const item = getSourceItem(store, i);

        // if no item - skip
        if (!item) {
          continue;
        }
        const val = item[prop];
        rgRow.push(val);
        mapping[i][prop] = val;
      }

      toCopy.push(rgRow);
    }
    return {
      data: toCopy,
      mapping,
    };
  }

  destroy() {
    this.unsubscribe.forEach(f => f());
  }
}

export function getCellData(val?: any) {
  if (typeof val === 'undefined' || val === null) {
    return '';
  }
  return val;
}

/**
 * Checks if the given rowDrag is a service for dragging rows.
 */
export function isRowDragService(
  rowDrag: RowDrag,
  model: ColumnDataSchemaModel,
): boolean {
  if (typeof rowDrag === 'function') {
    return rowDrag(model);
  }
  return !!rowDrag;
}
export function doPropMerge(existing: CellProps, extra: CellProps) {
  let props: CellProps = { ...extra, ...existing };
  // extend existing props
  if (extra.class) {
    if (typeof extra.class === 'object' && typeof props.class === 'object') {
      props.class = { ...extra.class, ...props.class };
    } else if (
      typeof extra.class === 'string' &&
      typeof props.class === 'object'
    ) {
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
