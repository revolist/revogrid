import {h, VNode} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import {DataSourceState} from '../../store/dataSource/data.store';
import { CELL_CLASS, DISABLED_CLASS } from '../../utils/consts';
import {Edition, RevoGrid, Selection} from '../../interfaces';

import BeforeSaveDataDetails = Edition.BeforeSaveDataDetails;
import ColumnDataSchemaModel = RevoGrid.ColumnDataSchemaModel;
import ColumnProp = RevoGrid.ColumnProp;
import DataSource = RevoGrid.DataSource;
import DataType = RevoGrid.DataType;

export interface ColumnServiceI {
  columns: RevoGrid.ColumnRegular[];

  customRenderer(r: number, c: number): VNode | string | void;

  isReadOnly(r: number, c: number): boolean;

  getCellData(r: number, c: number): string;
}

export default class ColumnService implements ColumnServiceI {
  private source: RevoGrid.ColumnRegular[] = [];

  get columns(): RevoGrid.ColumnRegular[] {
    return this.source;
  }

  set columns(source: RevoGrid.ColumnRegular[]) {
    this.source = source;
  }

  constructor(
    private dataStore: ObservableMap<DataSourceState<DataType, RevoGrid.DimensionRows>>,
    columns: RevoGrid.ColumnRegular[]) {
    this.source = columns;
  }

  isReadOnly(r: number, c: number): boolean {
    const readOnly: RevoGrid.ReadOnlyFormat = this.columns[c]?.readonly;
    if (typeof readOnly === 'function') {
      const data = this.rowDataModel(r, c);
      return readOnly(data);
    }
    return readOnly;
  }

  cellProperties(r: number, c: number, defaultProps: RevoGrid.CellProps): RevoGrid.CellProps{
    const cellClass: {[key: string]: boolean} = {
      [CELL_CLASS]: true,
      [DISABLED_CLASS]: this.isReadOnly(r, c)
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

      props = {...extra, ...props};
      // extend existing props
      if (extra.class) {
        if (typeof extra.class === 'object') {
          props.class = {...extra.class, ...cellClass};
        } else if (typeof extra.class === 'string') {
          cellClass[extra.class] = true;
        }
      }
      if (extra.style) {
        props.style = {...extra.style, ...props.style};
      }
    }
    return props;
  }

  customRenderer(r: number, c: number): VNode | string | void {
    const tpl = this.columns[c]?.cellTemplate;
    if (tpl) {
      const data = this.rowDataModel(r, c);
      return tpl(h as unknown as RevoGrid.HyperFunc<VNode>, data);
    }
    return;
  }

  getRowClass(r: number, prop: string): string {
    const data: DataSource = this.dataStore.get('items');
    const model: DataType = data[r] || {};
    return model[prop] || '';
  }

  getCellData(r: number, c: number): string {
    const data = this.rowDataModel(r, c);
    return ColumnService.getData(data.model[data.prop as number]);
  }

  getSaveData(rowIndex: number, c: number, val?: string): BeforeSaveDataDetails {
    if (typeof val === 'undefined') {
      val = this.getCellData(rowIndex, c)
    }
    const data = this.rowDataModel(rowIndex, c);
    return { prop: data.prop, rowIndex, val, model: data.model, type: this.dataStore.get('type')};
  }

  getCellEditor(_r: number, c: number): string | undefined {
    return this.columns[c]?.editor;
  }

  rowDataModel(r: number, c: number): ColumnDataSchemaModel {
    const column = this.columns[c];
    const prop: ColumnProp | undefined = column?.prop;

    const data: DataSource = this.dataStore.get('items');
    if (!data[r]) {
      console.error('unexpected count');
    }
    const model: DataType = data[r] || {};
    return {prop, model, data, column};
  }

  getRangeData(d: Selection.ChangedRange): RevoGrid.DataLookup {
    const changed: RevoGrid.DataLookup = {};
    const items: DataSource = this.dataStore.get('items');
    
    // get original length sizes
    const copyRowLength = d.oldRange.y1 - d.oldRange.y + 1;
    const copyColLength = d.oldProps.length;
    const copyFrom = this.copyRange(d.oldRange, d.oldProps, items);

    // rows
    for (let rowIndex = d.newRange.y, i = 0; rowIndex < d.newRange.y1 + 1; rowIndex++, i++) {

      // copy original data link
      const copyRow = copyFrom[i % copyRowLength];

      // columns
      for (let colIndex = d.newRange.x, j = 0; colIndex < d.newRange.x1 + 1; colIndex++, j++) {
        // check if old range area
        if ((rowIndex >= d.oldRange.y && rowIndex <= d.oldRange.y1) && (colIndex >= d.oldRange.x && colIndex <= d.oldRange.x1)) {
          continue;
        }

        const p = this.columns[colIndex].prop;
        const oldP = d.oldProps[j%copyColLength];

        /** if can write */
        if (!this.isReadOnly(rowIndex, colIndex)) {

          /** to show before save */
          if (!changed[rowIndex]) {
            changed[rowIndex] = {};
          }
          changed[rowIndex][p] = copyRow[oldP];
        }
      }
    }
    return changed;
  }

  applyRangeData(data: RevoGrid.DataLookup): void {
    const items: DataSource = this.dataStore.get('items');
    for (let rowIndex in data) {
      for (let prop in data[rowIndex]) {
        items[rowIndex][prop] = data[rowIndex][prop];
      }
    }
    this.dataStore.set('items', [...items]);
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

  private copyRange(range: Selection.RangeArea, rangeProps: RevoGrid.ColumnProp[], items: DataSource): DataType[] {
    const toCopy: DataType[] = [];
    for (let i = range.y; i < range.y1 + 1; i++) {
      const row: DataType = {};
      for (let prop of rangeProps) {
        row[prop] = items[i][prop];
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
}


