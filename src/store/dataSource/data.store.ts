import { createStore } from '@stencil/store';
import findIndex from 'lodash/findIndex';
import range from 'lodash/range';

import { Trimmed, trimmedPlugin } from './trimmed.plugin';
import { setStore } from '../../utils/store.utils';
import { proxyPlugin } from './data.proxy';
import { GroupLabelTemplateFunc } from '../../plugins/groupingRow/grouping.row.types';
import { DimensionRows, DimensionCols } from '../..';
import {
  ColumnProperties,
  ColumnGrouping,
  ColumnRegular,
  DataType,
  DataSourceState,
  Observable,
  ColumnProp,
} from '../..';

export interface Group extends ColumnProperties {
  name: string;
  children: (ColumnGrouping | ColumnRegular)[];
  // props/ids
  ids: (string | number)[];
}
export type Groups = Record<any, any>;
export type GDataType = DataType | ColumnRegular;
export type GDimension = DimensionRows | DimensionCols;
export type DSourceState<
  T1 extends GDataType,
  T2 extends GDimension,
> = DataSourceState<T1, T2> & {
  groupingCustomRenderer?: GroupLabelTemplateFunc | null;
};

/**
 * Data store
 * Manage the state of a data source and provide methods for updating, adding, and refreshing the data.
 */
export default class DataStore<T extends GDataType, ST extends GDimension> {
  private readonly dataStore: Observable<DSourceState<T, ST>>;
  get store(): Observable<DSourceState<T, ST>> {
    return this.dataStore;
  }
  constructor(type: ST, storeData?: DSourceState<T, ST>) {
    const store = (this.dataStore = createStore<DSourceState<T, ST>>({
      items: [],
      proxyItems: [],
      source: [],
      groupingDepth: 0,
      groups: {},
      type,
      trimmed: {},
      groupingCustomRenderer: undefined,
      ...storeData,
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
    grouping?: {
      depth: number;
      groups?: Groups;
      customRenderer?: GroupLabelTemplateFunc;
    },
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
  setData(input: Partial<DSourceState<T, ST>>) {
    const data: Partial<DSourceState<T, ST>> = {
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
export function getPhysical(
  store: Observable<DSourceState<any, any>>,
  virtualIndex: number,
) {
  const items = store.get('items');
  return items[virtualIndex];
}

/**
 * get all visible items
 * @param store - store to process
 */
export function getVisibleSourceItem(
  store: Observable<DSourceState<any, any>>,
) {
  const source = store.get('source');
  return store.get('items').map(v => source[v]);
}

/**
 * get mapped item from source
 * @param store - store to process
 * @param virtualIndex - virtual index to process
 */
export const getSourceItem = (
  store: Observable<DSourceState<any, any>>,
  virtualIndex: number,
): any | undefined => {
  const items = store.get('items');
  const source = store.get('source');
  return source[items[virtualIndex]];
};

/**
 * set item to source
 * @param store  - store to process
 * @param modelByIndex - collection of rows with virtual indexes to setup
 */
export function setSourceByVirtualIndex<T>(
  store: Observable<DSourceState<T, any>>,
  modelByIndex: Record<number, T>,
) {
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
export function setSourceByPhysicalIndex<T>(
  store: Observable<DSourceState<T, any>>,
  modelByIndex: Record<number, T>,
) {
  const source = store.get('source');
  for (let index in modelByIndex) {
    source[index] = modelByIndex[index];
  }
  store.set('source', [...source]);
}

export function setItems<T>(
  store: Observable<DSourceState<T, any>>,
  items: number[],
) {
  store.set('items', items);
}

export function getSourceItemVirtualIndexByProp(
  store: Observable<DSourceState<any, any>>,
  prop: ColumnProp,
) {
  const items = store.get('items');
  const source = store.get('source');
  const physicalIndex = findIndex(source, { prop });
  return items.indexOf(physicalIndex);
}
