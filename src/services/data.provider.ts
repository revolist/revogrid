import {ObservableMap} from '@stencil/store';
import {h, VNode} from '@stencil/core';

import {HyperFunc} from '../store/index.stencil';
import {CellTemplateFunc, DataSourceState} from "../interfaces";
import {CELL_CLASS} from "../components/data/cellConsts";
import dataStore from '../store/data.store';
import HeaderProviderObject from "./header.data.provider";
import DataProviderObject from "./cell.data.provider";




class DataProvider {
  private dataProvider?: DataProviderObject;
  private columnProvider?: HeaderProviderObject;

  constructor(private dataSourceStore:  ObservableMap<DataSourceState>) {
    this.columnProvider = new HeaderProviderObject(this.dataSourceStore);
    this.dataProvider = new DataProviderObject(this.dataSourceStore);
  }

  public cellClass(r: number, c: number): string {
    console.log(r, c);
    return CELL_CLASS;
  }

  public data(r: number, c: number): string|VNode {
    const tpl: CellTemplateFunc<VNode>|undefined = this.columnProvider.template(c);
    if (tpl) {
      return tpl(h as unknown as HyperFunc, this.dataProvider.rowDataModel(r, c));
    }
    return this.dataProvider.data(r, c);
  }

  public header(c: number): string {
    return this.columnProvider.data(c);
  }
}

const dataProvider: DataProvider = new DataProvider(dataStore);
export default dataProvider;