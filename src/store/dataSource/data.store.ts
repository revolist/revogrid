/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {setStore} from '../../utils/store.utils';
import {RevoGrid} from "../../interfaces";

export type DataSourceState<T extends (RevoGrid.DataType|RevoGrid.ColumnDataSchemaRegular)> = {
  items: T[];
};
export default class DataStore<T extends RevoGrid.DataType|RevoGrid.ColumnDataSchemaRegular> {
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


