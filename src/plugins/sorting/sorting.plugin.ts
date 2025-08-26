import size from 'lodash/size';
import debounce from 'lodash/debounce';

import { BasePlugin } from '../base.plugin';
import type {
  Order,
  ColumnRegular,
  DimensionRows,
  PluginProviders,
} from '@type';
import type { SortingConfig, SortingOrder, SortingOrderFunction } from './sorting.types';
import { getColumnByProp } from '../../utils/column.utils';
import { columnTypes, rowTypes } from '@store';
import { getComparer, getNextOrder, sortIndexByItems } from './sorting.func';

export * from './sorting.types';
export * from './sorting.func';
export * from './sorting.sign';

/**
 * Lifecycle
 * 1. @event `beforesorting` - Triggered when sorting just starts. Nothing has happened yet. This can be triggered from a column or from the source. If the type is from rows, the column will be undefined.
 * 2. @event `beforesourcesortingapply` - Triggered before the sorting data is applied to the data source. You can prevent this event, and the data will not be sorted.
 * 3. @event `beforesortingapply` - Triggered before the sorting data is applied to the data source. You can prevent this event, and the data will not be sorted. This event is only called from a column sorting click.
 * 4. @event `aftersortingapply` - Triggered after sorting has been applied and completed. This event occurs for both row and column sorting.
 *
 * Note: If you prevent an event, it will not proceed to the subsequent steps.
 */

export class SortingPlugin extends BasePlugin {
  // Current sorting order per column prop
  sorting?: SortingOrder;

  // Each column sorting function, multiple columns sorting supported
  sortingFunc?: SortingOrderFunction;
  /**
   * Delayed sorting promise
   */
  sortingPromise: (() => void) | null = null;

  /**
   * We need to sort only so often
   */
  postponeSort = debounce(
    (order?: SortingOrder, comparison?: SortingOrderFunction, ignoreViewportUpdate?: boolean) =>
      this.runSorting(order, comparison, ignoreViewportUpdate),
    50,
  );

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
          sortingFunc[col.prop] = getComparer(col, col.order);
          order[col.prop] = col.order;
        });

        if (cfg.additive) {
          this.sorting = {
            ...this.sorting,
            ...order,
          };
          this.sortingFunc = {
            ...this.sortingFunc,
            ...sortingFunc,
          };
        } else {
          // // set sorting
          this.sorting = order;
          this.sortingFunc = sortingFunc;
        }
      }
    }

    setConfig(config);

    this.addEventListener('sortingconfigchanged', ({ detail }) => {
      config = detail;
      setConfig(detail);
      this.startSorting(this.sorting, this.sortingFunc);
    });

    this.addEventListener('beforeheaderrender', ({
      detail,
    }) => {
      const { data: column } = detail;
      if (column.sortable) {
        detail.data = {
          ...column,
          order: this.sorting?.[column.prop],
        };
      }
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
        const cmp = getComparer(
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
        e.detail?.originalEvent?.shiftKey,
      );
    });
  }

  /**
   * Entry point for sorting, waits for all delayes, registers jobs
   */
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


  /**
   * Apply sorting to data on header click
   * If additive - add to existing sorting, multiple columns can be sorted
   */
  headerclick(column: ColumnRegular, additive: boolean) {
    const columnProp = column.prop;
    let order: Order = getNextOrder(this.sorting?.[columnProp]);
    const beforeEvent = this.emit('beforesorting', { column, order, additive });
    if (beforeEvent.defaultPrevented) {
      return;
    }
    order = beforeEvent.detail.order;

    // apply sort data
    const beforeApplyEvent = this.emit('beforesortingapply', {
      column: beforeEvent.detail.column,
      order,
      additive,
    });
    if (beforeApplyEvent.defaultPrevented) {
      return;
    }
    const cmp = getComparer(beforeApplyEvent.detail.column, beforeApplyEvent.detail.order);

    if (beforeApplyEvent.detail.additive && this.sorting) {
      const sorting: SortingOrder = {};
      const sortingFunc: SortingOrderFunction = {};

      if (columnProp in sorting && size(sorting) > 1 && order === undefined) {
        delete sorting[columnProp];
        delete sortingFunc[columnProp];
      } else {
        sorting[columnProp] = order;
        sortingFunc[columnProp] = cmp;
      }      

      this.sorting = {
        ...this.sorting,
        ...sorting,
      };
      
      // extend sorting function with new sorting for multiple columns sorting
      this.sortingFunc = {
        ...this.sortingFunc,
        ...sortingFunc,
      };
    } else {
      if (order) {
        // reset sorting
        this.sorting = { [columnProp]: order };
        this.sortingFunc = { [columnProp]: cmp };
      } else {
        delete this.sorting?.[columnProp];
        delete this.sortingFunc?.[columnProp];
      }
    }

    this.startSorting(this.sorting, this.sortingFunc);
  }

  runSorting(
    order?: SortingOrder,
    comparison?: SortingOrderFunction,
    ignoreViewportUpdate?: boolean
  ) {
    this.sort(order, comparison, undefined, ignoreViewportUpdate);
    this.sortingPromise?.();
    this.sortingPromise = null;
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
    // refresh columns to redraw column headers and show correct icon
    columnTypes.forEach((type) => {
      this.providers.column.dataSources[type].refresh();
    });
    this.emit('aftersortingapply');
  }
}


