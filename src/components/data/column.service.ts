import { DSourceState, getSourceItem, getVisibleSourceItem } from '@store';
import {
  Observable,
  CELL_CLASS,
  DISABLED_CLASS,
  getCellRaw,
  getCellData,
} from '../../utils';
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
  CellTemplateProp,
} from '@type';
import { JSXBase } from '@stencil/core/internal';

export type ColumnStores = {
  [T in DimensionCols]: Observable<DSourceState<ColumnRegular, DimensionCols>>;
};
export type RowStores = {
  [T in DimensionRows]: Observable<DSourceState<DataType, DimensionRows>>;
};

type DataToApplyOptions = {
  start: Cell;
  data: DataFormat[][];
  targetRange?: RangeArea | null;
};

type DataApplyBounds = {
  startRow: number;
  startCol: number;
  endRow: number;
  colLength: number;
};

type ClipboardRowApplyOptions = {
  bounds: DataApplyBounds;
  copyColLength: number;
  copyRow: DataFormat[];
  rowIndex: number;
  start: Cell;
  targetRange?: RangeArea | null;
};

export function getCellEditor(
  column: Pick<ColumnRegular, 'editor'> | undefined,
  editors: Editors = {},
): EditorCtr | undefined {
  const editor = column?.editor;
  if (!editor) {
    return undefined;
  }
  // reference
  if (typeof editor === 'string') {
    return editors[editor];
  }
  return editor;
}

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
    schemaModel: CellTemplateProp,
  ): CellProps {
    const props: CellProps = {
      ...defaultProps,
    };
    props.class = {
      ...(typeof props.class === 'string'
        ? { [props.class]: true }
        : props.class),
      [CELL_CLASS]: true,
      [DISABLED_CLASS]: this.isReadOnly(r, c),
    };

    const extra = schemaModel.column?.cellProperties?.(schemaModel);
    if (!extra) {
      return props;
    }
    return doPropMerge(props, extra);
  }

  getRowClass(r: number, prop: string): string {
    const model = getSourceItem(this.dataStore, r) || {};
    return model[prop] || '';
  }

  getSaveData(
    rowIndex: number,
    colIndex: number,
    val?: string,
  ): BeforeSaveDataDetails {
    const data = this.rowDataModel(rowIndex, colIndex);
    if (typeof val === 'undefined') {
      val = getCellData(data.value);
    }
    return {
      ...data,
      val,
    };
  }

  /**
   * Get cell data model for given rowIndex and colIndex
   * Used to pass data to editor/renderer
   */
  rowDataModel(rowIndex: number, colIndex: number): ColumnDataSchemaModel {
    const column = this.columns[colIndex];
    const prop = column?.prop;
    const model = getSourceItem(this.dataStore, rowIndex) || {};
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
      value: getCellRaw(model, column),
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

  getTransformedDataToApply({
    start,
    data,
    targetRange,
  }: DataToApplyOptions): {
    changed: DataLookup;
    range: RangeArea | null;
  } {
    const changed: DataLookup = {};
    const copyRowLength = data.length;
    if (!copyRowLength) {
      return {
        changed,
        range: null,
      };
    }

    const colLength = this.columns.length;
    const rowLength = this.dataStore.get('items').length;
    const bounds = this.getDataApplyBounds(
      start,
      targetRange,
      copyRowLength,
      rowLength,
      colLength,
    );
    if (!bounds) {
      return {
        changed,
        range: null,
      };
    }

    const { startRow, startCol, endRow } = bounds;
    let maxCol = startCol - 1;
    let lastRow = startRow - 1;

    // rows
    for (let rowIndex = startRow, i = 0; rowIndex <= endRow; rowIndex++, i++) {
      // copy original data link
      const copyRow = data[i % copyRowLength];
      const copyColLength = copyRow?.length || 0;
      if (!copyColLength) {
        continue;
      }

      maxCol = Math.max(
        maxCol,
        this.applyClipboardRow(changed, {
          bounds,
          copyColLength,
          copyRow,
          rowIndex,
          start,
          targetRange,
        }),
      );
      lastRow = rowIndex;
    }
    return {
      changed,
      range: this.getAppliedRange(bounds, lastRow, maxCol),
    };
  }

  private getDataApplyBounds(
    start: Cell,
    targetRange: RangeArea | null | undefined,
    copyRowLength: number,
    rowLength: number,
    colLength: number,
  ): DataApplyBounds | null {
    const startRow = targetRange?.y ?? start.y;
    const startCol = targetRange?.x ?? start.x;
    const endRow = Math.min(
      rowLength - 1,
      targetRange?.y1 ?? start.y + copyRowLength - 1,
    );
    if (endRow < startRow || startCol >= colLength) {
      return null;
    }
    return { startRow, startCol, endRow, colLength };
  }

  private applyClipboardRow(
    changed: DataLookup,
    {
      bounds,
      copyColLength,
      copyRow,
      rowIndex,
      start,
      targetRange,
    }: ClipboardRowApplyOptions,
  ): number {
    const endCol = Math.min(
      bounds.colLength - 1,
      targetRange?.x1 ?? start.x + copyColLength - 1,
    );

    for (
      let colIndex = bounds.startCol, j = 0;
      colIndex <= endCol;
      colIndex++, j++
    ) {
      if (this.isReadOnly(rowIndex, colIndex)) {
        continue;
      }
      const prop = this.columns[colIndex].prop;
      changed[rowIndex] = changed[rowIndex] || {};
      changed[rowIndex][prop] = copyRow[j % copyColLength];
    }
    return endCol;
  }

  private getAppliedRange(
    { startRow, startCol }: DataApplyBounds,
    lastRow: number,
    maxCol: number,
  ): RangeArea | null {
    if (lastRow < startRow || maxCol < startCol) {
      return null;
    }
    return getRange(
      { x: startCol, y: startRow },
      {
        y: lastRow,
        x: maxCol,
      },
    );
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
      model?: DataType;
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

function mergeClasses(
  class1: JSXBase.HTMLAttributes<HTMLElement>['class'] = {},
  class2: JSXBase.HTMLAttributes<HTMLElement>['class'] = {},
) {
  if (typeof class1 === 'string') {
    class1 = { [class1]: true };
  }
  if (typeof class2 === 'string') {
    class2 = { [class2]: true };
  }
  return { ...class1, ...class2 };
}

export function doPropMerge(existing: CellProps, extra: CellProps) {
  // if className is provided - remove it from props it messing with stencil
  if (extra.className) {
    extra.class = mergeClasses(extra.class, extra.className);
    delete extra.className;
  }
  let props: CellProps = { ...extra, ...existing };
  // extend existing props
  if (extra.class) {
    props.class = mergeClasses(props.class, extra.class);
  }
  if (extra.style) {
    props.style = { ...extra.style, ...props.style };
  }
  return props;
}
