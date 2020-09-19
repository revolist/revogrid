import {h, VNode} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import {DataSourceState} from '../../store/dataSource/data.store';
import {Edition, RevoGrid} from '../../interfaces';

import BeforeSaveDataDetails = Edition.BeforeSaveDataDetails;
import ColumnDataSchemaModel = RevoGrid.ColumnDataSchemaModel;
import ColumnProp = RevoGrid.ColumnProp;
import DataSource = RevoGrid.DataSource;
import DataType = RevoGrid.DataType;

export interface ColumnServiceI {
  columns: RevoGrid.ColumnRegular[];

  customRenderer(r: number, c: number): VNode | void;

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
    private dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>,
    columns: RevoGrid.ColumnRegular[]) {
    this.source = columns;
  }

  isReadOnly(r: number, c: number): boolean {
    const readOnly: RevoGrid.ReadOnlyFormat = this.columns[c]?.readonly;
    if (typeof readOnly === 'function') {
      return readOnly(r, c);
    }
    return readOnly;
  }

  customRenderer(r: number, c: number): VNode | void {
    const tpl = this.columns[c]?.cellTemplate;
    if (tpl) {
      return tpl(h as unknown as RevoGrid.HyperFunc<VNode>, this.rowDataModel(r, c));
    }
    return;
  }

  getCellData(r: number, c: number): string {
    const {prop, model} = this.rowDataModel(r, c);
    return ColumnService.getData(model[prop as number]);
  }

  getSaveData(rowIndex: number, c: number, val: string): BeforeSaveDataDetails {
    const {prop} = this.rowDataModel(rowIndex, c);
    return { prop, rowIndex, val, type: this.dataStore.get('type')};
  }

  getCellEditor(_r: number, c: number): string | undefined {
    return this.columns[c]?.editor;
  }

  rowDataModel(r: number, c: number): ColumnDataSchemaModel {
    const column = this.columns[c];
    const prop: ColumnProp | undefined = column?.prop;

    const data: DataSource = this.dataStore.get('items');
    const model: DataType = data[r] || {};
    return {prop, model, data, column};
  }

  static getData(val: any): string {
    if (typeof val === 'undefined' || val === 'null') {
      return '';
    }
    return val.toString();
  }
}


