import type { CellCompareFunc, ColumnProp, ColumnRegular, DataType, Order } from '@type';
import type {
  SortingColumnMap,
  SortingColumnOrder,
  SortingColumnRender,
  SortingOrder,
  SortingOrderFunction,
} from './sorting.types';
import { GROUP_COLUMN_PROP } from '../groupingRow/grouping.const';
import { isGrouping } from '../groupingRow/grouping.service';
import { getCellRaw } from '../../utils/column.utils';

/**
 * Checks whether a sorting map contains at least one active order.
 *
 * Empty maps and properties with `undefined` order are treated as inactive.
 */
export function hasActiveSorting(sorting?: SortingOrder): boolean {
  return Object.values(sorting || {}).some(Boolean);
}

/**
 * Compares column properties after object-key coercion.
 */
function isSameColumnProp(a: ColumnProp, b: ColumnProp) {
  return String(a) === String(b);
}

/**
 * Returns active sorting properties in explicit priority order.
 */
function getActiveSortingProps(
  sorting: SortingOrder | undefined,
  sortingOrder?: SortingColumnOrder,
) {
  const activeProps: ColumnProp[] = [];
  const add = (prop: ColumnProp) => {
    if (sorting?.[prop] && !activeProps.some(active => isSameColumnProp(active, prop))) {
      activeProps.push(prop);
    }
  };

  sortingOrder?.forEach(add);
  Object.keys(sorting || {}).forEach(add);
  return activeProps;
}

/**
 * Returns one-based additive sorting rank for a column.
 *
 * A single active sort does not need a visible rank, so it returns undefined.
 */
export function getSortingIndex(
  sorting: SortingOrder | undefined,
  prop: ColumnProp,
  sortingOrder?: SortingColumnOrder,
): SortingColumnRender['sortIndex'] {
  const activeProps = getActiveSortingProps(sorting, sortingOrder);
  if (activeProps.length <= 1) {
    return undefined;
  }
  const index = activeProps.findIndex(active => isSameColumnProp(active, prop));
  return index >= 0 ? index + 1 : undefined;
}

/**
 * Collects only active comparator functions from a sorting function map.
 *
 * This keeps undefined comparator entries from triggering sorting work.
 */
function activeSortingEntries(
  sortingFunc: SortingOrderFunction = {},
  sortingOrder?: SortingColumnOrder,
) {
  const entries: [ColumnProp, CellCompareFunc][] = [];
  const add = (prop: ColumnProp) => {
    const cmp = sortingFunc[prop];
    if (typeof cmp === 'function' && !entries.some(([active]) => isSameColumnProp(active, prop))) {
      entries.push([prop, cmp]);
    }
  };

  sortingOrder?.forEach(add);
  Object.keys(sortingFunc).forEach(add);
  return entries;
}

/**
 * Reads and normalizes a value for the built-in default comparer.
 */
function getDefaultCompareValue(
  item: DataType,
  prop: ColumnProp,
  column?: Partial<ColumnRegular>,
) {
  const aRaw = column ? getCellRaw(item, column as ColumnRegular) : item?.[prop];
  return typeof aRaw === 'number' ? aRaw : aRaw?.toString().toLowerCase();
}

/**
 * Compares two already-normalized default comparer values.
 */
function compareValues(av: any, bv: any) {
  if (av === bv) {
    return 0;
  }
  if (av > bv) {
    return 1;
  }
  return -1;
}

/**
 * Sorts indexes by precomputed values for default column comparers.
 *
 * This avoids repeatedly parsing the same cell value during large default
 * sorts while preserving normal multi-column ordering.
 */
function sortIndexByDefaultComparers(
  indexes: number[],
  source: DataType[],
  entries: [ColumnProp, CellCompareFunc][],
  sorting: SortingOrder,
  sortingColumns: SortingColumnMap,
): number[] {
  const prepared = entries.map(([prop]) => {
    const values: any[] = [];
    const column = sortingColumns[prop];
    for (const index of indexes) {
      values[index] = getDefaultCompareValue(
        source[index],
        prop,
        column,
      );
    }
    return {
      order: sorting[prop],
      values,
    };
  });

  return indexes.sort((a, b) => {
    for (const { order, values } of prepared) {
      const sorted = compareValues(values[a], values[b]);
      if (sorted) {
        return order === 'desc' ? -sorted : sorted;
      }
    }
    return 0;
  });
}

/**
 * Detects whether the optimized default-comparer path can be used.
 *
 * Grouped rows and custom `cellCompare` functions stay on the legacy
 * comparator path to preserve their exact behavior.
 */
function canUseDefaultCompareFastPath(
  entries: [ColumnProp, CellCompareFunc][],
  indexes: number[],
  source: DataType[],
  sorting?: SortingOrder,
  sortingColumns?: SortingColumnMap,
) {
  return !indexes.some(index => isGrouping(source[index])) && !!sorting && !!sortingColumns && entries.every(([prop]) => {
    const order = sorting[prop];
    const column = sortingColumns[prop];
    return !!order && !column?.cellCompare;
  });
}

/**
 * Group placeholder rows are generated for their grouping column. If sorting is
 * requested for another column, the grouped source must be unwrapped first.
 */
function hasGroupingRowsForOtherSorting(
  entries: [ColumnProp, CellCompareFunc][],
  indexes: number[],
  source: DataType[],
) {
  return indexes.some(index => {
    const item = source[index];
    return isGrouping(item) && !entries.some(([prop]) =>
      isSameColumnProp(item[GROUP_COLUMN_PROP], prop));
  });
}

/**
 * Sorts row indexes against a source collection.
 *
 * @param indexes - Current proxy row indexes to sort.
 * @param source - Full source collection addressed by the indexes.
 * @param sortingFunc - Comparator functions by column property.
 * @param sorting - Active sorting order by column property.
 * @param sortingColumns - Column metadata by property for default-comparer optimization.
 * @param sortingOrder - Active sorting priority in click/config insertion order.
 * @returns Sorted proxy indexes. With no sorting function keys, returns source-order indexes.
 */
export function sortIndexByItems(
  indexes: number[],
  source: DataType[],
  sortingFunc: SortingOrderFunction = {},
  sorting?: SortingOrder,
  sortingColumns?: SortingColumnMap,
  sortingOrder?: SortingColumnOrder,
): number[] {
  const hasSortingKeys = Object.keys(sortingFunc).length > 0;
  const sortingEntries = activeSortingEntries(sortingFunc, sortingOrder);
  // if no sorting - return unsorted indexes
  if (sortingEntries.length === 0) {
    // Unsorted indexes
    return hasSortingKeys ? indexes : [...new Array(indexes.length).keys()];
  }
  if (hasGroupingRowsForOtherSorting(sortingEntries, indexes, source)) {
    return indexes;
  }
  if (canUseDefaultCompareFastPath(sortingEntries, indexes, source, sorting, sortingColumns)) {
    return sortIndexByDefaultComparers(
      indexes,
      source,
      sortingEntries,
      sorting!,
      sortingColumns!,
    );
  }
  //
  /**
   * go through all indexes and align in new order
   * performs a multi-level sorting by applying multiple comparison functions to determine the order of the items based on different properties.
   */
  return indexes.sort((a, b) => {
    const itemA = source[a];
    const itemB = source[b];
    for (const [prop, cmp] of sortingEntries) {
      if (isGrouping(itemA)) {
        if (!isSameColumnProp(itemA[GROUP_COLUMN_PROP], prop)) {
          return a - b;
        }
      }
      if (isGrouping(itemB)) {
        if (!isSameColumnProp(itemB[GROUP_COLUMN_PROP], prop)) {
          return a - b;
        }
      }
      /**
       * If the comparison function returns a non-zero value (sorted), it means that the items should be sorted based on the given property. In such a case, the function immediately returns the sorted value, indicating the order in which the items should be arranged.
       * If none of the comparison functions result in a non-zero value, indicating that the items are equal or should remain in the same order, the function eventually returns 0.
       */
      const sorted = cmp?.(prop, itemA, itemB);
      if (sorted) {
        return sorted;
      }
    }
    return 0;
  });
}

export function defaultCellCompare(this: { column?: ColumnRegular }, prop: ColumnProp, a: DataType, b: DataType) {
  const aRaw = this.column ? getCellRaw(a, this.column) : a?.[prop];
  const bRaw = this.column ? getCellRaw(b, this.column) : b?.[prop];
  const av = typeof aRaw === 'number' ? aRaw : aRaw?.toString().toLowerCase();
  const bv = typeof bRaw === 'number' ? bRaw : bRaw?.toString().toLowerCase();

  if (av === bv) {
    return 0;
  }
  if (av > bv) {
    return 1;
  }
  return -1;
}

export function descCellCompare(cmp: CellCompareFunc) {
  return (prop: ColumnProp, a: DataType, b: DataType): number => {
    return -1 * cmp(prop, a, b);
  };
}

export function getNextOrder(currentOrder: Order): Order {
  switch (currentOrder) {
    case undefined:
      return 'asc';
    case 'asc':
      return 'desc';
    case 'desc':
      return undefined;
  }
}


export function getComparer(column: Partial<ColumnRegular> | undefined, order: Order): CellCompareFunc | undefined {
  const cellCmp: CellCompareFunc =
    column?.cellCompare?.bind({ order }) || defaultCellCompare?.bind({ column, order });
  if (order == 'asc') {
    return cellCmp;
  }
  if (order == 'desc') {
    return descCellCompare(cellCmp);
  }
  return undefined;
}
