import { createStore } from '@stencil/store';
import findIndex from 'lodash/findIndex';
import range from 'lodash/range';

import { Trimmed, trimmedPlugin } from './trimmed.plugin';
import { setStore } from '../../utils/store.utils';
import { Observable, RevoGrid } from '../../interfaces';
import { proxyPlugin } from './data.proxy';
import { GroupLabelTemplateFunc } from '../../plugins/groupingRow/grouping.row.types';

export interface Group extends RevoGrid.ColumnProperties {
  name: string;
  children: (RevoGrid.ColumnGrouping | RevoGrid.ColumnRegular)[];
  // props/ids
  ids: (string | number)[];
}
export type Groups = Record<any, any>;
export type GDataType = RevoGrid.DataType | RevoGrid.ColumnRegular;
export type GDimension = RevoGrid.DimensionRows | RevoGrid.DimensionCols;
export type DataSourceState<T1 extends GDataType, T2 extends GDimension> = RevoGrid.DataSourceState<T1, T2> & {
  groupingCustomRenderer?: GroupLabelTemplateFunc | null;
};

export default class DataStore<T extends GDataType, ST extends GDimension> {
  private readonly dataStore: Observable<DataSourceState<T, ST>>;
  get store(): Observable<DataSourceState<T, ST>> {
    return this.dataStore;
  }
  constructor(type: ST) {
    const store = (this.dataStore = createStore<DataSourceState<T, ST>>({
      items: [],
      proxyItems: [],
      source: [],
      groupingDepth: 0,
      groups: {},
      type,
      trimmed: {},
      groupingCustomRenderer: undefined,
    }));
    store.use(proxyPlugin(store));
    store.use(trimmedPlugin(store));
  }

  /**
   * full data source update
   * @param source - data column/rgRow source
   * @param grouping - grouping information if present
   */
  updateData(
    source: T[],
    grouping?: { depth: number; groups?: Groups; customRenderer?: GroupLabelTemplateFunc },
    silent = false,
  ) {
    // during full update we do drop trim
    if (!silent) {
      this.store.set('trimmed', {});
    }
    // clear items
    this.store.set('items', []);
    const items = range(0, source?.length || 0);

    // set proxy first
    setStore(this.store, {
      source,
      proxyItems: [...items],
    });
    // update data items
    this.store.set('items', items);
    // apply grouping if present
    if (grouping) {
      setStore(this.store, {
        groupingDepth: grouping.depth,
        groups: grouping.groups,
        groupingCustomRenderer: grouping.customRenderer,
      });
    }
  }

  addTrimmed(some: Partial<Trimmed>) {
    let trimmed = this.store.get('trimmed');
    trimmed = { ...trimmed, ...some };
    setStore(this.store, { trimmed });
  }

  // local data update
  setData(input: Partial<DataSourceState<T, ST>>) {
    const data: Partial<DataSourceState<T, ST>> = {
      ...input,
    };
    setStore(this.store, data);
  }

  refresh() {
    const source = this.store.get('source');
    this.store.set('source', [...source]);
  }
}
/**
 * get physical index by virtual
 * @param store - store to process
 */
export function getPhysical(store: Observable<DataSourceState<any, any>>, virtualIndex: number) {
  const items = store.get('items');
  return items[virtualIndex];
}

/**
 * get all visible items
 * @param store - store to process
 */
export function getVisibleSourceItem(store: Observable<DataSourceState<any, any>>) {
  const source = store.get('source');
  return store.get('items').map(v => source[v]);
}

/**
 * get mapped item from source
 * @param store - store to process
 * @param virtualIndex - virtual index to process
 */
export function getSourceItem(store: Observable<DataSourceState<any, any>>, virtualIndex: number): any | undefined {
  const items = store.get('items');
  const source = store.get('source');
  return source[items[virtualIndex]];
}

/**
 * set item to source
 * @param store  - store to process
 * @param modelByIndex - collection of rows with virtual indexes to setup
 */
export function setSourceByVirtualIndex<T>(store: Observable<DataSourceState<T, any>>, modelByIndex: Record<number, T>) {
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
export function setSourceByPhysicalIndex<T>(store: Observable<DataSourceState<T, any>>, modelByIndex: Record<number, T>) {
  const source = store.get('source');
  for (let index in modelByIndex) {
    source[index] = modelByIndex[index];
  }
  store.set('source', [...source]);
}

export function setItems<T>(store: Observable<DataSourceState<T, any>>, items: number[]) {
  store.set('items', items);
}

export function getSourceItemVirtualIndexByProp(store: Observable<DataSourceState<any, any>>, prop: RevoGrid.ColumnProp) {
  const items = store.get('items');
  const source = store.get('source');
  const physicalIndex = findIndex(source, { prop });
  return items.indexOf(physicalIndex);
}
