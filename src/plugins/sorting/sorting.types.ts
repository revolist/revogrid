import type { CellCompareFunc, ColumnProp, ColumnRegular, Order } from '@type';

/**
 * Current sorting order per column property.
 */
export type SortingOrder = Record<ColumnProp, Order>;

/**
 * Comparator functions indexed by column property.
 *
 * Undefined comparator entries are treated as inactive sorting entries.
 */
export type SortingOrderFunction = Record<
  ColumnProp,
  CellCompareFunc | undefined
>;

/**
 * Column metadata indexed by column property.
 *
 * This is an internal companion map for `SortingOrderFunction`. It lets the
 * sorting helper detect the default comparer path without mutating
 * `CellCompareFunc` instances or changing the public comparator contract.
 */
export type SortingColumnMap = Record<
  ColumnProp,
  Partial<ColumnRegular> | undefined
>;

/**
 * Active sorting priority in click/config insertion order.
 *
 * This is stored separately from `SortingOrder` because JavaScript object keys
 * that look like integers are enumerated in numeric order, not insertion order.
 */
export type SortingColumnOrder = ColumnProp[];

/**
 * Header metadata used to display additive sort priority.
 */
export type SortingColumnRender = {
  /**
   * One-based additive sorting rank.
   */
  sortIndex?: number;
};

/**
 * Sorting information emitted after columns are set.
 */
export type ColumnSetEvent = {
  order: SortingOrder;
};

/**
 * External sorting configuration.
 */
export type SortingConfig = {
  /**
   * Columns to sort by.
   */
  columns?: { prop: ColumnProp; order: Order; cellCompare?: CellCompareFunc }[];
  /**
   * If true, merge provided columns with the current sorting state.
   * If false or omitted, replace current sorting state.
   */
  additive?: boolean;
};
