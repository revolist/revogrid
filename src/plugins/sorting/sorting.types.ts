import type { CellCompareFunc, ColumnProp, Order } from '@type';

export type SortingOrder = Record<ColumnProp, Order>;
export type SortingOrderFunction = Record<
  ColumnProp,
  CellCompareFunc | undefined
>;
export type ColumnSetEvent = {
  order: SortingOrder;
};

export type SortingConfig = {
  columns?: { prop: ColumnProp; order: Order; cellCompare?: CellCompareFunc }[];
};
