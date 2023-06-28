import { DataSourceState, getSourceItem, getVisibleSourceItem, setSourceByVirtualIndex } from '../../store/dataSource/data.store';
import { CELL_CLASS, DISABLED_CLASS } from '../../utils/consts';
import { Edition, Observable, RevoGrid, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';

import { isGroupingColumn } from '../../plugins/groupingRow/grouping.service';
import { slice } from 'lodash';

export type ColumnSource = Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
export type RowSource = Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

export type ColumnStores = {
  [T in RevoGrid.DimensionCols]: ColumnSource;
};
export type RowStores = {
  [T in RevoGrid.DimensionRows]: RowSource;
};

export default class ColumnService {
  private unsubscribe: { (): void }[] = [];
  get columns(): RevoGrid.ColumnRegular[] {
    return getVisibleSourceItem(this.source);
  }

  hasGrouping = false;
  type: RevoGrid.DimensionCols;

  constructor(private dataStore: RowSource, private source: ColumnSource) {
    this.unsubscribe.push(source.onChange('source', s => this.checkGrouping(s)));
    this.checkGrouping(source.get('source'));
    this.type = source.get('type');
  }

  private checkGrouping(cols: RevoGrid.ColumnRegular[]) {
    for (let rgCol of cols) {
      if (isGroupingColumn(rgCol)) {
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

  getRowClass(r: number, prop: string): string {
    const model = getSourceItem(this.dataStore, r) || {};
    return model[prop] || '';
  }

  getCellData(r: number, c: number): string {
    const data = this.rowDataModel(r, c);
    return ColumnService.getData(data.model[data.prop as number]);
  }

  getSaveData(rowIndex: number, colIndex: number, val?: string): Edition.BeforeSaveDataDetails {
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

  rowDataModel(rowIndex: number, colIndex: number): RevoGrid.ColumnDataSchemaModel {
    const column = this.columns[colIndex];
    const prop: RevoGrid.ColumnProp | undefined = column?.prop;
    const model = getSourceItem(this.dataStore, rowIndex) || {};
    return {
      prop,
      model,
      data: this.dataStore.get('source'),
      column,
      rowIndex,
      colIndex,
    };
  }

  getRangeData(d: Selection.ChangedRange, columns: RevoGrid.ColumnRegular[]): {
    changed: RevoGrid.DataLookup,
    mapping: Selection.OldNewRangeMapping,
  } {
    const changed: RevoGrid.DataLookup = {};

    // get original length sizes
    const copyColLength = d.oldRange.x1 - d.oldRange.x + 1;
    const copyRowLength = d.oldRange.y1 - d.oldRange.y + 1;
    const mapping: Selection.OldNewRangeMapping = {};

    // rows
    for (let rowIndex = d.newRange.y, i = 0; rowIndex < d.newRange.y1 + 1; rowIndex++, i++) {
      // copy original data link
      const oldRowIndex = d.oldRange.y + i % copyRowLength;
      const copyRow = getSourceItem(this.dataStore, oldRowIndex) || {};

      // columns
      for (let colIndex = d.newRange.x, j = 0; colIndex < d.newRange.x1 + 1; colIndex++, j++) {
        // check if old range area
        if (rowIndex >= d.oldRange.y && rowIndex <= d.oldRange.y1 && colIndex >= d.oldRange.x && colIndex <= d.oldRange.x1) {
          continue;
        }

        // requested column beyond range
        if (!this.columns[colIndex]) {
          continue;
        }
        const prop = this.columns[colIndex]?.prop;
        const copyColIndex = d.oldRange.x + j % copyColLength;
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
            colProp: copyColumnProp,
            rowIndex: oldRowIndex
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
    const items: Record<number, RevoGrid.DataType> = {};
    for (let rowIndex in data) {
      const oldModel = (items[rowIndex] = getSourceItem(this.dataStore, parseInt(rowIndex, 10)));
      if (!oldModel) {
        continue;
      }
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
    d: Selection.RangeArea,
    store: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>,
  ) {
    const area: {
      prop: RevoGrid.ColumnProp,
      rowIndex: number,
      colIndex: number,
      model: RevoGrid.DataSource,
      colType: RevoGrid.MultiDimensionType,
      type: RevoGrid.MultiDimensionType,
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
    range: Selection.RangeArea,
    store: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>,
  ) {
    const cols = [...this.columns];
    const props = slice(cols, range.x, range.x1 + 1).map(v => v.prop);
    const toCopy: RevoGrid.DataFormat[][] = [];
    const mapping: { [rowIndex: number]: { [colProp: RevoGrid.ColumnProp]: any } } = {};

    // rows indexes
    for (let i = range.y; i <= range.y1; i++) {
      const rgRow: RevoGrid.DataFormat[] = [];
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
      mapping
    };
  }

  static getData(val?: any) {
    if (typeof val === 'undefined' || val === null) {
      return '';
    }
    return val;
  }

  destroy() {
    this.unsubscribe.forEach(f => f());
  }
}
