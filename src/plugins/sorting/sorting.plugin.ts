import debounce from 'lodash/debounce';

import { BasePlugin } from '../base.plugin';
import type {
  CellCompareFunc,
  ColumnProp,
  Order,
  ColumnRegular,
  DimensionRows,
  PluginProviders,
} from '@type';
import type {
  SortingColumnMap,
  SortingColumnOrder,
  SortingConfig,
  SortingOrder,
  SortingOrderFunction,
} from './sorting.types';
import { getColumnByProp } from '../../utils/column.utils';
import { columnTypes, rowTypes } from '@store';
import {
  getComparer,
  getNextOrder,
  getSortingIndex,
  hasActiveSorting,
  sortIndexByItems,
} from './sorting.func';

export * from './sorting.types';
export * from './sorting.func';
export * from './sorting.sign';

type SortingState = {
  sorting: SortingOrder;
  sortingFunc: SortingOrderFunction;
  sortingColumns: SortingColumnMap;
  sortingOrder: SortingColumnOrder;
};

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
  /**
   * Current sorting order per column property.
   */
  sorting?: SortingOrder;

  /**
   * Comparator functions indexed by column property.
   *
   * Multiple columns can be sorted at the same time.
   */
  sortingFunc?: SortingOrderFunction;

  /**
   * Column metadata for the current sorting state.
   *
   * Used internally to optimize default sorting without changing comparator
   * functions or their public API contract.
   */
  private sortingColumns?: SortingColumnMap;

  /**
   * Active sorting priority in click/config insertion order.
   *
   * Required for numeric column props because object key iteration does not
   * preserve insertion order for integer-like keys.
   */
  private sortingOrder?: SortingColumnOrder;

  /**
   * Delayed sorting promise registered in the grid render job queue.
   */
  sortingPromise: (() => void) | null = null;

  /**
   * Debounced sorting entry point.
   *
   * Sorting can be requested by column changes, source changes, and header
   * clicks in quick succession, so the actual sort is delayed and coalesced.
   */
  postponeSort = debounce(
    (
      order?: SortingOrder,
      comparison?: SortingOrderFunction,
      sortingColumns?: SortingColumnMap,
      sortingOrder?: SortingColumnOrder,
      ignoreViewportUpdate?: boolean,
    ) => this.runSorting(order, comparison, sortingColumns, sortingOrder, ignoreViewportUpdate),
    50,
  );

  constructor(
    public revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    config?: SortingConfig,
  ) {
    super(revogrid, providers);

    this.applySortingConfig(config);

    this.addEventListener('sortingconfigchanged', ({ detail }) => {
      config = detail;
      this.applySortingConfig(detail);
      this.startSorting(this.sorting, this.sortingFunc, this.sortingColumns, this.sortingOrder);
    });

    this.addEventListener('beforeheaderrender', ({
      detail,
    }) => {
      const { data: column } = detail;
      if (column.sortable) {
        detail.data = {
          ...column,
          order: this.sorting?.[column.prop],
          sortIndex: getSortingIndex(this.sorting, column.prop, this.sortingOrder),
        };
      }
    });

    this.addEventListener('beforeanysource', ({
      detail: { type },
    }) => {
      // if sorting was provided - sort data
      if (hasActiveSorting(this.sorting) && this.sortingFunc) {
        const event = this.emit('beforesourcesortingapply', { type, sorting: this.sorting });
        if (event.defaultPrevented) {
          return;
        }
        this.startSorting(this.sorting, this.sortingFunc, this.sortingColumns, this.sortingOrder);
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
      const sortingColumns: SortingColumnMap = {};
      const sortingOrder: SortingColumnOrder = [];
      const sorting: SortingOrder = {};

      for (let prop in order) {
        if (order[prop]) {
          const column = getColumnByProp(columns, prop);
          const cmp = getComparer(
            column,
            order[prop],
          );
          sorting[prop] = order[prop];
          sortingFunc[prop] = cmp;
          sortingColumns[prop] = column;
          sortingOrder.push(prop);
        }
      }

      // set sorting
      this.sorting = hasActiveSorting(sorting) ? sorting : undefined;
      this.sortingFunc = this.sorting ? sortingFunc : undefined;
      this.sortingColumns = this.sorting ? sortingColumns : undefined;
      this.sortingOrder = this.sorting ? sortingOrder : undefined;
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
   * Creates mutable sorting maps from current state when additive sorting is requested.
   */
  private createSortingState(additive?: boolean): SortingState {
    return {
      sorting: additive ? { ...this.sorting } : {},
      sortingFunc: additive ? { ...this.sortingFunc } : {},
      sortingColumns: additive ? { ...this.sortingColumns } : {},
      sortingOrder: additive ? [...(this.sortingOrder ?? [])] : [],
    };
  }

  /**
   * Stores normalized sorting state, clearing inactive empty maps.
   */
  private setSortingState({
    sorting,
    sortingFunc,
    sortingColumns,
    sortingOrder,
  }: SortingState) {
    this.sorting = hasActiveSorting(sorting) ? sorting : undefined;
    this.sortingFunc = this.sorting ? sortingFunc : undefined;
    this.sortingColumns = this.sorting ? sortingColumns : undefined;
    this.sortingOrder = this.sorting ? sortingOrder : undefined;
  }

  /**
   * Adds or replaces a column in a sorting state.
   */
  private setColumnSorting(
    state: SortingState,
    prop: ColumnProp,
    order: Order,
    cmp: CellCompareFunc | undefined,
    column: ColumnRegular | Partial<ColumnRegular> | undefined,
  ) {
    state.sorting[prop] = order;
    state.sortingFunc[prop] = cmp;
    state.sortingColumns[prop] = column;
    if (!state.sortingOrder.some(sortingProp => String(sortingProp) === String(prop))) {
      state.sortingOrder.push(prop);
    }
  }

  /**
   * Removes a column from a sorting state.
   */
  private clearColumnSorting(state: SortingState, prop: ColumnProp) {
    delete state.sorting[prop];
    delete state.sortingFunc[prop];
    delete state.sortingColumns[prop];
    const index = state.sortingOrder.findIndex(sortingProp => String(sortingProp) === String(prop));
    if (index >= 0) {
      state.sortingOrder.splice(index, 1);
    }
  }

  /**
   * Normalizes external sorting configuration into internal order,
   * comparator, and column metadata maps.
   */
  private applySortingConfig(cfg?: SortingConfig) {
    if (!cfg) {
      return;
    }
    const state = this.createSortingState(cfg.additive);
    cfg.columns?.forEach(col => {
      if (col.order) {
        this.setColumnSorting(
          state,
          col.prop,
          col.order,
          getComparer(col, col.order),
          col,
        );
        return;
      }
      this.clearColumnSorting(state, col.prop);
    });

    this.setSortingState(state);
  }

  /**
   * Schedules sorting before the next render.
   *
   * @param order - Active sorting order by column property.
   * @param sortingFunc - Comparator functions by column property.
   * @param sortingColumns - Column metadata by property.
   * @param sortingOrder - Active sorting priority in click/config insertion order.
   * @param ignoreViewportUpdate - Skips dimension position recalculation when true.
   */
  startSorting(
    order?: SortingOrder,
    sortingFunc?: SortingOrderFunction,
    sortingColumns?: SortingColumnMap,
    sortingOrder?: SortingColumnOrder,
    ignoreViewportUpdate?: boolean,
  ) {
    if (!this.sortingPromise) {
      // add job before render
      this.revogrid.jobsBeforeRender.push(
        new Promise<void>(resolve => {
          this.sortingPromise = resolve;
        }),
      );
    }
    this.postponeSort(order, sortingFunc, sortingColumns, sortingOrder, ignoreViewportUpdate);
  }


  /**
   * Applies sorting requested by a sortable header click.
   *
   * @param column - Column that initiated sorting.
   * @param additive - If true, add/remove this column from the current multi-sort state.
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
    this.applyHeaderSorting(
      beforeApplyEvent.detail.column,
      beforeApplyEvent.detail.additive,
      order,
      cmp,
    );

    this.startSorting(this.sorting, this.sortingFunc, this.sortingColumns, this.sortingOrder);
  }

  /**
   * Applies sorting state produced by a header click.
   */
  private applyHeaderSorting(
    column: ColumnRegular,
    additive: boolean,
    order: Order,
    cmp: CellCompareFunc | undefined,
  ) {
    if (!additive) {
      this.setSortingState(order ? {
        sorting: { [column.prop]: order },
        sortingFunc: { [column.prop]: cmp },
        sortingColumns: { [column.prop]: column },
        sortingOrder: [column.prop],
      } : this.createSortingState());
      return;
    }

    const state = this.createSortingState(true);
    if (order) {
      this.setColumnSorting(state, column.prop, order, cmp, column);
    } else {
      this.clearColumnSorting(state, column.prop);
    }
    this.setSortingState(state);
  }

  /**
   * Runs a scheduled sort and resolves the render-blocking sorting promise.
   *
   * @param order - Active sorting order by column property.
   * @param comparison - Comparator functions by column property.
   * @param sortingColumns - Column metadata by property.
   * @param sortingOrder - Active sorting priority in click/config insertion order.
   * @param ignoreViewportUpdate - Skips dimension position recalculation when true.
   */
  runSorting(
    order?: SortingOrder,
    comparison?: SortingOrderFunction,
    sortingColumns?: SortingColumnMap,
    sortingOrder?: SortingColumnOrder,
    ignoreViewportUpdate?: boolean
  ) {
    this.sort(order, comparison, sortingColumns, sortingOrder, undefined, ignoreViewportUpdate);
    this.sortingPromise?.();
    this.sortingPromise = null;
  }

  /**
   * Sorts row proxy indexes by sorting functions.
   *
   * @requires proxyItems applied to row store
   * @requires source applied to row store
   *
   * @param sorting - per column sorting
   * @param sortingFunc - Comparator functions by column property.
   * @param sortingColumns - Column metadata by property.
   * @param sortingOrder - Active sorting priority in click/config insertion order.
   * @param types - Row stores to sort.
   * @param ignoreViewportUpdate - Skips dimension position recalculation when true.
   */
  sort(
    sorting?: SortingOrder,
    sortingFunc?: SortingOrderFunction,
    sortingColumns?: SortingColumnMap,
    sortingOrder?: SortingColumnOrder,
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
        storeService.setData({ proxyItems: newItemsOrder });
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
          sorting,
          sortingColumns,
          sortingOrder,
        );
       
        // take row indexes before trim applied and proxy items
        const prevItems = storeService.store.get('items');
        storeService.setData({
          proxyItems: newItemsOrder,
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
