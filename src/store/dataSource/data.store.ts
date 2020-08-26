/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {
  ColumnDataSchemaRegular,
  DataType
} from '../../interfaces';
import {setStore} from '../../utils/store.utils';

export type DataSourceState<T extends (DataType|ColumnDataSchemaRegular)> = {
  items: T[];
};
export default class DataStore<T extends DataType|ColumnDataSchemaRegular> {
  private readonly dataStore: ObservableMap<DataSourceState<T>>;
  get store(): ObservableMap<DataSourceState<T>> {
    return this.dataStore;
  }
  constructor() {
    this.dataStore = createStore({ items: [] });
  }

  updateData(items: T[]): void {
    setStore(this.store, { items });
  }
}


