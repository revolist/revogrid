import {ObservableMap} from '@stencil/store';
import {h, VNode} from '@stencil/core';

import {HyperFunc} from '../store/index.stencil';
import {
  CellTemplateFunc, ColumnData,
  ColumnDataSchemaModel, ColumnDataSchemaRegular,
  ColumnProp,
  DataSource,
  DataSourceState,
  DataType, ReadOnlyFormat
} from '../interfaces';
import dataStore, {setDataColumn, updateData} from '../store/dataSource/data.store';
import HeaderProviderObject from './header.data.provider';
import {setViewport} from '../store/viewPort/viewport.store';
import {setRealSize} from '../store/dimension/dimension.store';

class DataProvider {
  private columnProvider?: HeaderProviderObject;

  constructor(private dataSourceStore:  ObservableMap<DataSourceState>) {
    this.columnProvider = new HeaderProviderObject(this.dataSourceStore);
  }

  cellRenderer(r: number, c: number): string|VNode {
    const tpl: CellTemplateFunc<VNode>|undefined = this.columnProvider.template(c);
    if (tpl) {
      return tpl(h as unknown as HyperFunc, this.rowDataModel(r, c));
    }
    return this.getCellData(r, c);
  }

  setData(data: DataType[]): void {
    updateData({...data});

    const realCount: number = data.length;
    setViewport({ realCount }, 'row');
    setRealSize(realCount, 'row' );
  }

  getCellData(r: number, c: number): string {
    const {prop, model} = this.rowDataModel(r, c);
    return model[prop as number] || '';
  }

  setCellData(r: number, c: number, val: string): void {
    const {data, model, prop} = this.rowDataModel(r, c);
    model[prop as number] = val;
    updateData({...data});
  }

  setColumns(columns: ColumnData): void {
    const realCount: number = setDataColumn(columns);
    setViewport({ realCount }, 'col');
    setRealSize(realCount, 'col' );
  }

  rowDataModel(r: number, c: number): ColumnDataSchemaModel {
    const prop: ColumnProp = this.dataSourceStore.get('columnsFlat')[c]?.prop;
    const data: DataSource = this.dataSourceStore.get('data');
    const model: DataType = data[r] || {};
    return { prop, model, data };
  }

  header(c: number): string {
    return this.columnProvider.data(c);
  }

  column(c: number): ColumnDataSchemaRegular|undefined {
    return this.columnProvider.getColumn(c);
  }

  isReadOnly(r: number, c: number): boolean {
    const readOnly: ReadOnlyFormat = this.dataSourceStore.get('columnsFlat')[c]?.readonly;
    if (typeof readOnly === 'function') {
      return readOnly(r, c);
    }
    return readOnly;
  }
}

const dataProvider: DataProvider = new DataProvider(dataStore);
export default dataProvider;