/**
 * Storing data storage for column/row
 */

import {createStore, ObservableMap} from '@stencil/store';
import findIndex from 'lodash/findIndex';
import range from 'lodash/range';

import {setStore} from '../../utils/store.utils';
import {RevoGrid} from "../../interfaces";
import DataType = RevoGrid.DataType;
import ColumnRegular = RevoGrid.ColumnRegular;
import DimensionRows = RevoGrid.DimensionRows;
import DimensionCols = RevoGrid.DimensionCols;

export interface Group extends RevoGrid.ColumnProperties {
  name: string;
  children: RevoGrid.ColumnRegular[];
  ids: (string|number)[];
}
type Trimmed = Record<number, boolean>;
export type Groups = {[level: number]: Group[]};
export type GDataType = DataType|ColumnRegular;
export type GDimension = DimensionRows|DimensionCols;
export type DataSourceState<T extends GDataType, ST extends GDimension> = {
  // items - index based array for mapping to source tree
  items: number[];
  // original data source
  source: T[];
  // grouping
  groupingDepth: number;
  groups: Groups;
  // data source type
  type: ST;
  // trim data, to hide entities from visible data source
  trimmed: Trimmed;
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
      type,
      trimmed: {}
    });
    this.dataStore.use({
      set: (k, newVal, oldVal) => {
        switch(k) {
          case 'trimmed':
            const items = this.dataStore.get('items');
            const trimmed = newVal as Trimmed;
            const oldTrimmed = oldVal as Trimmed;

            // check if not longer trimmed put back to items
            for (let o in oldTrimmed) {
              const index = parseInt(o, 10);
              if (!trimmed[o] && items.indexOf(index) === -1) {
                items.push(index);
              }
            }

            // check if present in new trimmed remove from items
            const newItems = items.filter(v => !trimmed[v]);
            this.dataStore.set('items', newItems);
            break;
        }
      }
    });
  }

  /**
   * full data source update
   * @param source - data column/row source
   * @param grouping - grouping information if present
   */
  updateData(source: T[], grouping?: { depth: number; groups: Groups }) {
    const data: Partial<DataSourceState<T, ST>> = {
      source,
      // during full update we do trim data drop
      trimmed: {}
    };
    this.indexMapping(data);
    if (grouping) {
      data.groupingDepth = grouping.depth;
      data.groups = grouping.groups;
    }
    this.setData(data);
  }

  // local data update
  setData(input: Partial<DataSourceState<T, ST>>) {
    const data: Partial<DataSourceState<T, ST>> = {
      ...input
    };
    setStore(this.store, data);
  }

  private indexMapping(data: Partial<DataSourceState<T, ST>> ) {
    if (data.source) {
      data.items = range(0, data.source.length);
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
export function setSourceByVirtualIndex<T>(store: ObservableMap<DataSourceState<T, any>>, modelByIndex: Record<number, T>) {
  const items = store.get('items');
  const source = store.get('source');

  for (let virtualIndex in modelByIndex) {
    const realIndex = items[virtualIndex];
    source[realIndex] = modelByIndex[virtualIndex];
  }
  store.set('source', [...source]);
}

/**
 * set item to source
 * @param store  - store to process
 * @param modelByIndex - collection of rows with physical indexes to setup
 */
export function setSourceByPhysicalIndex<T>(store: ObservableMap<DataSourceState<T, any>>, modelByIndex: Record<number, T>) {
  const source = store.get('source');
  for (let index in modelByIndex) {
    source[index] = modelByIndex[index];
  }
  store.set('source', [...source]);
}

export function getSourceItemVirtualIndexByProp(store: ObservableMap<DataSourceState<any, any>>, prop: RevoGrid.ColumnProp) {
  const items = store.get('items');
  const source = store.get('source');
  const physicalIndex = findIndex(source, { prop });
  return items.indexOf(physicalIndex);
}
