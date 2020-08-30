/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {setStore} from '../../utils/store.utils';
import {RevoGrid} from "../../interfaces";

type Group = {
  name: string;
  ids: (string|number)[];
}
export type Groups = {[level: number]: Group[]};
export type DataSourceState<T extends (RevoGrid.DataType|RevoGrid.ColumnDataSchemaRegular)> = {
  items: T[];
  groupingDepth: number;
  groups: Groups;
};
export default class DataStore<T extends RevoGrid.DataType|RevoGrid.ColumnDataSchemaRegular> {
  private readonly dataStore: ObservableMap<DataSourceState<T>>;
  get store(): ObservableMap<DataSourceState<T>> {
    return this.dataStore;
  }
  constructor() {
    this.dataStore = createStore({ items: [], groupingDepth: 0, groups: {} });
  }

  updateData(items: T[], grouping?: { depth: number; groups: Groups }): void {
    const data: Partial<DataSourceState<T>> = { items };
    if (grouping) {
      data.groupingDepth = grouping.depth;
      data.groups = grouping.groups;
    }
    setStore(this.store, data );
  }
}


