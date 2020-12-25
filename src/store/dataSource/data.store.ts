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
import findIndex from 'lodash/findIndex';

export interface Group extends RevoGrid.ColumnProperties {
  name: string;
  children: RevoGrid.ColumnRegular[];
  ids: (string|number)[];
}
export type Groups = {[level: number]: Group[]};
export type GDataType = DataType|ColumnRegular;
export type GDimension = DimensionRows|DimensionCols;
export type DataSourceState<T extends GDataType, ST extends GDimension> = {
  items: number[];
  source: T[];
  groupingDepth: number;
  trimmed: Record<number, boolean>;
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
      source: [],
      groupingDepth: 0,
      groups: {},
      trimmed: {},
      type
    });
  }

  updateData(source: T[], grouping?: { depth: number; groups: Groups }): void {
    const data: Partial<DataSourceState<T, ST>> = {
      source
    };
    this.indexMapping(data);
    if (grouping) {
      data.groupingDepth = grouping.depth;
      data.groups = grouping.groups;
    }
    this.setData(data);
  }

  setData(input: Partial<DataSourceState<T, ST>>): void {
    const data: Partial<DataSourceState<T, ST>> = {
      ...input
    };
    setStore(this.store, data);
  }

  private indexMapping(data: Partial<DataSourceState<T, ST>> ) {
    if (data.source) {
      // Array.keys() require an ES6 polyfill in order to work in all browsers
      data.items = [...Array(data.source.length).keys()]
    }
    return data;
  }
}

/**
 * get all visible items
 * @param store - store to process
 */
export function getVisibleSourceItem(store: ObservableMap<DataSourceState<any, any>>) {
  const source = store.get('source');
  return store.get('items').map(v => source[v]);
}

/**
 * get mapped item from source
 * @param store - store to process
 * @param virtualIndex - virtual index to process
 */
export function getSourceItem(store: ObservableMap<DataSourceState<any, any>>, virtualIndex: number) {
  const items = store.get('items');
  const source = store.get('source');
  return source[items[virtualIndex]];
}

/**
 * set item to source
 * @param store  - store to process
 * @param modelByIndex - collection of rows with virtual indexes to setup
 */
export function setSourceItem<T>(store: ObservableMap<DataSourceState<T, any>>, modelByIndex: Record<number, T>) {
  const items = store.get('items');
  const source = store.get('source');

  for (let virtualIndex in modelByIndex) {
    const realIndex = items[virtualIndex];
    source[realIndex] = modelByIndex[virtualIndex];
  }
  store.set('source', [...source]);
}

export function getSourceItemVirtualIndexByProp(store: ObservableMap<DataSourceState<any, any>>, prop: RevoGrid.ColumnProp) {
  const items = store.get('items');
  const source = store.get('source');
  const physicalIndex = findIndex(source, { prop });
  return items.indexOf(physicalIndex);
}
