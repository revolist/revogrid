import {ObservableMap} from '@stencil/store';
import {h, VNode} from '@stencil/core';

import {HyperFunc} from '../store/index.stencil';
import {CellTemplateFunc, ColumnDataSchemaModel, DataSourceState} from '../interfaces';
import dataStore, {updateData} from '../store/data.store';
import HeaderProviderObject from './header.data.provider';

class DataProvider {
  private columnProvider?: HeaderProviderObject;

  constructor(private dataSourceStore:  ObservableMap<DataSourceState>) {
    this.columnProvider = new HeaderProviderObject(this.dataSourceStore);
  }

  public cellRenderer(r: number, c: number): string|VNode {
    const tpl: CellTemplateFunc<VNode>|undefined = this.columnProvider.template(c);
    if (tpl) {
      return tpl(h as unknown as HyperFunc, this.rowDataModel(r, c));
    }
    return this.data(r, c);
  }


  data(r: number, c: number): string {
    const {prop, model} = this.rowDataModel(r, c);
    return model[prop as number] || '';
  }

  setData(r: number, c: number, val: string): void {
    const data = this.dataSourceStore.get('data');
    data[r][c] = val;
    updateData({...data});
  }

  rowDataModel(r: number, c: number): ColumnDataSchemaModel {
    const prop = this.dataSourceStore.get('columns')[c]?.prop;
    const model = this.dataSourceStore.get('data')[r] || {};
    return { prop, model };
  }

  header(c: number): string {
    return this.columnProvider.data(c);
  }
}

const dataProvider: DataProvider = new DataProvider(dataStore);
export default dataProvider;