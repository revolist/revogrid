import findIndex from 'lodash/findIndex';
import range from 'lodash/range';
import { createStore } from '@stencil/store';

import {
  getVisibleItems,
  Trimmed,
  trimmedPlugin,
} from './trimmed.plugin';
import { setStore, Observable } from '../../utils';
import { proxyPlugin } from './data.proxy';
import { pendingItemsPlugin } from './data.pending.plugin';
import type {
  GroupCellTemplateFunc,
  GroupLabelTemplateFunc,
} from '../../plugins/groupingRow/grouping.row.types';
import type {
  DimensionRows,
  DimensionCols,
  ColumnProperties,
  ColumnGrouping,
  ColumnRegular,
  DataType,
  DataSourceState,
  ColumnProp,
} from '@type';

export interface Group extends ColumnProperties {
  name: string;
  children: (ColumnGrouping | ColumnRegular)[];
  // physical indexes to start from
  indexes: number[];
}
export type Groups = Record<number, Group[]>;
export type GDataType = DataType | ColumnRegular;
export type GDimension = DimensionRows | DimensionCols;
export type DSourceState<
  T1 extends GDataType,
  T2 extends GDimension,
> = DataSourceState<T1, T2> & {
  groupingCustomRenderer?: GroupLabelTemplateFunc | null;
  groupingCellRenderer?: GroupCellTemplateFunc | null;
};

/**
 * Data store
 * Manage the state of a data source and provide methods for updating, adding, and refreshing the data.
 */
export class DataStore<T extends GDataType, ST extends GDimension> {
  private readonly dataStore: Observable<DSourceState<T, ST>>;
  /**
   * The source, proxy order, and trims may continue changing,
   * but visible items must remain empty until the operation finishes.
   */
  private itemsPending = false;
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
      groupingCellRenderer: undefined,
      ...storeData,
    }));
    store.use(proxyPlugin(store));
    store.use(trimmedPlugin(store));
    store.use(pendingItemsPlugin(store, () => this.itemsPending));
  }

  /**
   * full data source update
   * @param source - data column/rgRow source
   * @param grouping - grouping information if present
   * @param silent - if true, store will be updated without resetting trimmed state
   * @param preserveTrimmed - if true, current trimmed indexes will be re-applied to the new source, use with caution because physical indexes may change across full data refreshes
   */
  updateData(
    source: T[],
    grouping?: {
      // grouping depth, how many levels of groups are there
      depth: number;
      groups?: Groups;
      // custom renderer for group label, if not provided default will be used
      customRenderer?: GroupLabelTemplateFunc;
      // custom renderer for horizontally virtualized group cells
      cellRenderer?: GroupCellTemplateFunc;
    },
    // if true, store will be updated without resetting trimmed state
    silent = false,
    // if true, current trimmed indexes will be re-applied to the new source
    preserveTrimmed = false,
  ) {
    const trimmed = this.store.get('trimmed');
    const preserveCurrentTrimmed = silent && preserveTrimmed;
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
    // Explicit trim preservation is opt-in because physical indexes may change
    // across full data refreshes.
    this.store.set(
      'items',
      preserveCurrentTrimmed ? getVisibleItems(items, trimmed) : items,
    );
    // apply grouping if present
    if (grouping) {
      setStore(this.store, {
        groupingDepth: grouping.depth,
        // if groups are not provided, we will consider that there is only one group with all items
        groups: grouping.groups,
        groupingCustomRenderer: grouping.customRenderer,
        groupingCellRenderer: grouping.cellRenderer,
      });
    }
  }

  addTrimmed(some: Partial<Trimmed>) {
    let trimmed = this.store.get('trimmed');
    trimmed = { ...trimmed, ...some };
    setStore(this.store, { trimmed });
  }

  /**
   * Keeps visible items empty while an asynchronous source operation is pending.
   * Releasing the state restores the current proxy order with all trims applied.
   */
  setItemsPending(pending: boolean) {
    if (this.itemsPending === pending) {
      return;
    }
    this.itemsPending = pending;
    if (pending) {
      this.store.set('items', []);
      return;
    }

    this.store.set(
      'items',
      getVisibleItems(
        this.store.get('proxyItems'),
        this.store.get('trimmed'),
      ),
    );
  }

  setSourceData(items: Record<number, any>, mutate = true) {
    setSourceByVirtualIndex(this.store, items, mutate);
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
export const getSourceItem = <T1 extends GDataType, T2 extends GDimension>(
  store: Observable<DSourceState<T1, T2>>,
  virtualIndex: number,
) => {
  const source = store.get('source');
  return source[getSourcePhysicalIndex(store, virtualIndex)];
};
/**
 * Get physical index from virtual index
 */
export const getSourcePhysicalIndex = <T1 extends GDataType, T2 extends GDimension>(
  store: Observable<DSourceState<T1, T2>>,
  virtualIndex: number,
) => {
  const items = store.get('items');
  return items[virtualIndex];
};

/**
 * Apply silently item/model/row value to data source
 * @param store  - data source with changes
 * @param modelByIndex - collection of rows/values with virtual indexes to setup/replace in store/data source
 * @param mutate - if true, store will be mutated and whole viewport will be re-rendered
 */
export function setSourceByVirtualIndex<T extends GDataType>(
  store: Observable<DSourceState<T, any>>,
  modelByIndex: Record<number, T | undefined>,
  mutate = true,
) {
  const items = store.get('items');
  const source = store.get('source');

  for (let virtualIndex in modelByIndex) {
    const realIndex = items[virtualIndex];
    const item = modelByIndex[virtualIndex];
    source[realIndex] = item as T;
  }
  if (mutate) {
    store.set('source', [...source]);
  }
}

/**
 * set item to source
 * @param store  - store to process
 * @param modelByIndex - collection of rows with physical indexes to setup
 * @param mutate - if true, store will be mutated and whole viewport will be re-rendered
 */
export function setSourceByPhysicalIndex<T extends GDataType>(
  store: Observable<DSourceState<T, any>>,
  modelByIndex: Record<number, T>,
  mutate = true,
) {
  const source = store.get('source');
  for (let index in modelByIndex) {
    source[index] = modelByIndex[index];
  }
  if (mutate) {
    store.set('source', [...source]);
  }
}

export function setItems<T extends GDataType>(
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
