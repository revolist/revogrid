// filter.types.ts

import type { ColumnProp, ColumnRegular, HyperFunc } from '@type';
import type { FilterType } from './filter.indexed';
import type { VNode } from '@stencil/core';

export type DateEnum =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'thisweek'
  | 'lastweek'
  | 'nextweek'
  | 'thismonth'
  | 'lastmonth'
  | 'nextmonth'
  | 'thisyear'
  | 'lastyear'
  | 'nextyear';

export type ExtraField = 'input' | 'datepicker' | ((h: HyperFunc<VNode>, config: {
  value: any;
  filter: FilterItem;
  prop: ColumnProp;
  index: number;
  placeholder: string;
  onInput: (value: any) => void;
  onFocus: () => void;
}) => VNode | VNode[]);

export type LogicFunctionParam = any;
export type LogicFunctionExtraParam =
  | 'select'
  | 'input'
  | 'multi'
  | 'datepicker'
  | number
  | Date
  | DateEnum
  | null
  | undefined
  | string
  | string[]
  | number[];
export interface LogicFunction<T1 = LogicFunctionParam, T2 = LogicFunctionExtraParam> {
  (value: T1, extra?: T2): boolean;
  extra?: ExtraField;
}

export interface CustomFilter<T1 = LogicFunctionParam, T2 = LogicFunctionExtraParam> {
  /**
   * Property defined in column { filter: string/number/abstract/enum...etc }
   */
  columnFilterType: string;
  /**
   * Filter name
   */
  name: string;
  /**
   * Function to apply the filter
   */
  func: LogicFunction<T1, T2>;
};

export interface FilterCaptions {
  title: string;
  save: string;
  reset: string;
  ok: string;
  cancel: string;
  add: string;
  placeholder: string;
  and: string;
  or: string;
};

export interface FilterLocalization {
  captions: Partial<FilterCaptions>;
  filterNames: Record<FilterType, string>;
}
/**
 * Filter configuration for a column. This is the type of the `filter` property on a column.
 */
export interface ColumnFilterConfig {
  /**
   * The collection of filters to be applied to the column.
   */
  collection?: Record<ColumnProp, FilterCollectionItem>;
  /**
   * The names of the filters to be included in the filter dropdown.
   */
  include?: string[];
  /**
   * A mapping of custom filter names to custom filter functions.
   */
  customFilters?: Record<string, CustomFilter>;
  /**
   * The property on the column idintifying which has the filter is applied.
   */
  filterProp?: string;
  /**
   * The localization for the filter dropdown.
   */
  localization?: FilterLocalization;
  /**
   * Information about the multi-filter items.
   */
  multiFilterItems?: MultiFilterItem;
  /**
   * Whether or not to disable dynamic filtering. If set to true, the filter will only be applied
   * when the user clicks on the filter button.
   */
  disableDynamicFiltering?: boolean;

  /**
   * Whether or not to close the filter panel when clicking outside
   */
  closeFilterPanelOnOutsideClick?: boolean;
}

export type FilterCollectionItem = {
  type: FilterType;
  value?: any;
};


export interface FilterItem {
  // column id
  prop?: ColumnProp;
  // filter type definition
  type?: FilterType;
  // value for additional filtering, text value or some id
  value?: any;
}

export interface FilterData {
  id: number;
  /**
   * Filter type
   */
  type: FilterType;
  /**
   * Filter value
   */
  value?: any;
  /**
   * Filter invisible in filter panel
   */
  hidden?: boolean;
  /**
   * Filter relation
   */
  relation?: 'and' | 'or';
};

export interface MultiFilterItem {
  [prop: string]: FilterData[];
}

export interface ShowData extends FilterItem, Omit<ColumnRegular, 'filter'> {
  x: number;
  y: number;
  /**
   * Auto correct position if it is out of document bounds
   */
  autoCorrect?: boolean;
  filterTypes?: Record<string, string[]>;
  filterItems?: MultiFilterItem;
  // hide default filters
  hideDefaultFilters?: boolean;
  // pass vnodes from plugins
  extraContent?: (data: ShowData) => any;
}
