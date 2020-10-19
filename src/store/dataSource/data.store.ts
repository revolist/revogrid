/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {setStore} from '../../utils/store.utils';
import {RevoGrid} from "../../interfaces";
import DataType = RevoGrid.DataType;
import ColumnRegular = RevoGrid.ColumnRegular;
import DimensionRows = RevoGrid.DimensionRows;
import DimensionCols = RevoGrid.DimensionCols;

export interface Group extends RevoGrid.ColumnProperties {
  name: string;
  ids: (string|number)[];
}
export type Groups = {[level: number]: Group[]};
export type GDataType = DataType|ColumnRegular;
export type GDimension = DimensionRows|DimensionCols;
export type DataSourceState<T extends GDataType, ST extends GDimension> = {
  items: T[];
  groupingDepth: number;
  groups: Groups;
  type: ST;
};

export default class DataStore<T extends GDataType, ST extends GDimension> {
  private readonly dataStore: ObservableMap<DataSourceState<T, ST>>;
  get store(): ObservableMap<DataSourceState<T, ST>> {
    return this.dataStore;
  }
  constructor(type: ST) {
    this.dataStore = createStore({
      items: [],
      groupingDepth: 0,
      groups: {},
      type
    });
  }

  updateData(items: T[], grouping?: { depth: number; groups: Groups }): void {
    const data: Partial<DataSourceState<T, ST>> = { items };
    if (grouping) {
      data.groupingDepth = grouping.depth;
      data.groups = grouping.groups;
    }
    this.setData(data);
  }

  setData(data: Partial<DataSourceState<T, ST>>): void {
    setStore(this.store, data );
  }
}


