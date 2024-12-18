import size from 'lodash/size';
import debounce from 'lodash/debounce';

import { BasePlugin } from '../base.plugin';
import type {
  ColumnProp,
  Order,
  CellCompareFunc,
  ColumnRegular,
  DataType,
  DimensionRows,
  PluginProviders,
} from '@type';
import type { SortingConfig, SortingOrder, SortingOrderFunction } from './sorting.types';
import { getCellRaw, getColumnByProp } from '../../utils/column.utils';
import { rowTypes } from '@store';
import { sortIndexByItems } from './sorting.func';

export * from './sorting.types';

/**
 * Lifecycle
 * 1. @event `beforesorting` - Triggered when sorting just starts. Nothing has happened yet. This can be triggered from a column or from the source. If the type is from rows, the column will be undefined.
 * 1.1. @event `beforesourcesortingapply` - Triggered before the sorting data is applied to the data source. You can prevent this event, and the data will not be sorted.
 * 2. @method `updateColumnSorting` - Updates the column sorting icon on the grid and the column itself, but the data remains untouched.
 * 3. @event `beforesortingapply` - Triggered before the sorting data is applied to the data source. You can prevent this event, and the data will not be sorted. This event is only called from a column sorting click.
 * 4. @event `aftersortingapply` - Triggered after sorting has been applied and completed. This event occurs for both row and column sorting.
 *
 * Note: If you prevent an event, it will not proceed to the subsequent steps.
 */

export class SortingPlugin extends BasePlugin {
  // sorting order per column
  sorting?: SortingOrder;

  // sorting function per column, multiple columns sorting supported
  sortingFunc?: SortingOrderFunction;
  sortingPromise: (() => void) | null = null;
  postponeSort = debounce(
    (order?: SortingOrder, comparison?: SortingOrderFunction, ignoreViewportUpdate?: boolean) =>
      this.runSorting(order, comparison, ignoreViewportUpdate),
    50,
  );

  runSorting(
    order?: SortingOrder,
    comparison?: SortingOrderFunction,
    ignoreViewportUpdate?: boolean
  ) {
    this.sort(order, comparison, undefined, ignoreViewportUpdate);
    this.sortingPromise?.();
    this.sortingPromise = null;
  }

  constructor(
    public revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    config?: SortingConfig,
  ) {
    super(revogrid, providers);

    const setConfig = (cfg?: SortingConfig) => {
      if (cfg) {
        const sortingFunc: SortingOrderFunction = {};
        const order: SortingOrder = {};
        cfg.columns?.forEach(col => {
          sortingFunc[col.prop] = this.getComparer(col, col.order);
          order[col.prop] = col.order;
        });

        // // set sorting
        this.sorting = order;
        this.sortingFunc = sortingFunc;
      }
    }

    setConfig(config);

    this.addEventListener('sortingconfigchanged', ({ detail }) => {
      config = detail;
      setConfig(detail);
      this.startSorting(this.sorting, this.sortingFunc);
    });

    this.addEventListener('beforeanysource', ({
      detail: { type },
    }) => {
      // if sorting was provided - sort data
      if (!!this.sorting && this.sortingFunc) {
        const event = this.emit('beforesourcesortingapply', { type, sorting: this.sorting });
        if (event.defaultPrevented) {
          return;
        }
        this.startSorting(this.sorting, this.sortingFunc);
      }
    });
    this.addEventListener('aftercolumnsset', ({
      detail: { order },
    }) => {
      // if config provided - do nothing, read from config
      if (config) {
        return;
      }

      const columns = this.providers.column.getColumns();
      const sortingFunc: SortingOrderFunction = {};

      for (let prop in order) {
        const cmp = this.getComparer(
          getColumnByProp(columns, prop),
          order[prop],
        );
        sortingFunc[prop] = cmp;
      }

      // set sorting
      this.sorting = order;
      this.sortingFunc = order && sortingFunc;
    });
    this.addEventListener('beforeheaderclick', (e) => {
      if (e.defaultPrevented) {
        return;
      }

      if (!e.detail?.column?.sortable) {
        return;
      }

      this.headerclick(
        e.detail.column,
        e.detail.index,
        e.detail?.originalEvent?.shiftKey,
      );
    });
  }

  startSorting(order?: SortingOrder, sortingFunc?: SortingOrderFunction, ignoreViewportUpdate?: boolean) {
    if (!this.sortingPromise) {
      // add job before render
      this.revogrid.jobsBeforeRender.push(
        new Promise<void>(resolve => {
          this.sortingPromise = resolve;
        }),
      );
    }
    this.postponeSort(order, sortingFunc, ignoreViewportUpdate);
  }

  getComparer(column: Partial<ColumnRegular> | undefined, order: Order): CellCompareFunc | undefined {
    const cellCmp: CellCompareFunc =
      column?.cellCompare?.bind({ order }) || this.defaultCellCompare?.bind({ column, order });
    if (order == 'asc') {
      return cellCmp;
    }
    if (order == 'desc') {
      return this.descCellCompare(cellCmp);
    }
    return undefined;
  }

  /**
   * Apply sorting to data on header click
   * If additive - add to existing sorting, multiple columns can be sorted
   */
  headerclick(column: ColumnRegular, index: number, additive: boolean) {
    let order: Order = this.getNextOrder(column.order);
    const beforeEvent = this.emit('beforesorting', { column, order, additive });
    if (beforeEvent.defaultPrevented) {
      return;
    }
    order = beforeEvent.detail.order;
    const newCol = this.providers.column.updateColumnSorting(
      beforeEvent.detail.column,
      index,
      order,
      additive,
    );

    // apply sort data
    const beforeApplyEvent = this.emit('beforesortingapply', {
      column: newCol,
      order,
      additive,
    });
    if (beforeApplyEvent.defaultPrevented) {
      return;
    }
    const cmp = this.getComparer(beforeApplyEvent.detail.column, beforeApplyEvent.detail.order);

    if (beforeApplyEvent.detail.additive && this.sorting) {
      const sorting: SortingOrder = {};
      const sortingFunc: SortingOrderFunction = {};

      this.sorting = {
        ...this.sorting,
        ...sorting,
      };
      // extend sorting function with new sorting for multiple columns sorting
      this.sortingFunc = {
        ...this.sortingFunc,
        ...sortingFunc,
      };

      if (column.prop in sorting && size(sorting) > 1 && order === undefined) {
        delete sorting[column.prop];
        delete sortingFunc[column.prop];
      } else {
        sorting[column.prop] = order;
        sortingFunc[column.prop] = cmp;
      }
    } else {
      if (order) {
        // reset sorting
        this.sorting = { [column.prop]: order };
        this.sortingFunc = { [column.prop]: cmp };
      } else {
        delete this.sorting?.[column.prop];
        delete this.sortingFunc?.[column.prop];
      }
    }

    this.startSorting(this.sorting, this.sortingFunc);
  }

  /**
   * Sort items by sorting function
   * @requires proxyItems applied to row store
   * @requires source applied to row store
   *
   * @param sorting - per column sorting
   * @param data - this.stores['rgRow'].store.get('source')
   */
  sort(
    sorting?: SortingOrder,
    sortingFunc?: SortingOrderFunction,
    types: DimensionRows[] = rowTypes,
    ignoreViewportUpdate = false
  ) {
    // if no sorting - reset
    if (!Object.keys(sorting || {}).length) {
      for (let type of types) {
        const storeService = this.providers.data.stores[type];
        // row data
        const source = storeService.store.get('source');
        // row indexes
        const proxyItems = storeService.store.get('proxyItems');
        // row indexes
        const newItemsOrder = Array.from({ length: source.length }, (_, i) => i); // recover indexes range(0, source.length)
        this.providers.dimension.updateSizesPositionByNewDataIndexes(type, newItemsOrder, proxyItems);
        storeService.setData({ proxyItems: newItemsOrder, source: [...source], });
      }
    } else {
      for (let type of types) {
        const storeService = this.providers.data.stores[type];
        // row data
        const source = storeService.store.get('source');
        // row indexes
        const proxyItems = storeService.store.get('proxyItems');

        const newItemsOrder = sortIndexByItems(
          [...proxyItems],
          source,
          sortingFunc,
        );
       
        // take row indexes before trim applied and proxy items
        const prevItems = storeService.store.get('items');
        storeService.setData({
          proxyItems: newItemsOrder,
          source: [...source],
        });
        // take currently visible row indexes
        const newItems = storeService.store.get('items');
        if (!ignoreViewportUpdate) {
          this.providers.dimension
            .updateSizesPositionByNewDataIndexes(type, newItems, prevItems);
        }
      }
    }
    this.emit('aftersortingapply');
  }

  defaultCellCompare(this: { column?: ColumnRegular }, prop: ColumnProp, a: DataType, b: DataType) {
    const aRaw = this.column ? getCellRaw(a, this.column) : a?.[prop];
    const bRaw = this.column ? getCellRaw(b, this.column) : b?.[prop];
    const av = aRaw?.toString().toLowerCase();
    const bv = bRaw?.toString().toLowerCase();

    return av == bv ? 0 : av > bv ? 1 : -1;
  }

  descCellCompare(cmp: CellCompareFunc) {
    return (prop: ColumnProp, a: DataType, b: DataType): number => {
      return -1 * cmp(prop, a, b);
    };
  }

  getNextOrder(currentOrder: Order): Order {
    switch (currentOrder) {
      case undefined:
        return 'asc';
      case 'asc':
        return 'desc';
      case 'desc':
        return undefined;
    }
  }
}
