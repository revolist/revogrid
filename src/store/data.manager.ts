import {ObservableMap} from '@stencil/store';

import {setStore} from './helpers';
import DataProvider from './data.provider';

export default class DataSource {
  public readonly provider: DataProvider;
  constructor(private store: ObservableMap<DataSourceState>) {
    this.provider = new DataProvider(this.store);
  }

  public setData(data: DataType[]) {
    setStore(this.store, { data });
  }

  public setColumn(columns: ColumnData) {
    setStore(this.store, { columns });
  }
}
