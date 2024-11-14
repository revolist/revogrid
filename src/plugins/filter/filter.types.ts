import type { ColumnProp, ColumnRegular } from '@type';
import type { FilterType } from './filter.indexed';

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

export type ExtraField = 'input' | 'select' | 'multi' | 'datepicker';

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
export type LogicFunction<T1 = LogicFunctionParam, T2 = LogicFunctionExtraParam> = {
  (value: T1, extra?: T2): boolean;
  extra?: ExtraField;
};

type CustomFilter<T1 = LogicFunctionParam, T2 = LogicFunctionExtraParam> = {
  columnFilterType: string; // property defined in column filter: string/number/abstract/enum...etc
  name: string;
  func: LogicFunction<T1, T2>;
};

export type FilterCaptions = {
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

export type FilterLocalization = {
  captions: FilterCaptions;
  filterNames: Record<FilterType, string>;
};
/**
 * Filter configuration for a column. This is the type of the `filter` property on a column.
 */
export type ColumnFilterConfig = {
  /**
   * The collection of filters to be applied to the column.
   */
  collection?: FilterCollection;
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
};
type FilterCollectionItem = {
  filter: LogicFunction;
  type: FilterType;
  value?: any;
};

export type FilterCollection = Record<ColumnProp, FilterCollectionItem>;


export type FilterItem = {
  // column id
  prop?: ColumnProp;
  // filter type definition
  type?: FilterType;
  // value for additional filtering, text value or some id
  value?: any;
};

export type FilterData = {
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
  relation: 'and' | 'or';
};

export type MultiFilterItem = {
  [prop: string]: FilterData[];
};

export type ShowData = {
  x: number;
  y: number;
  /**
   * Auto correct position if it is out of document bounds
   */
  autoCorrect?: boolean;
  filterTypes?: Record<string, string[]>;
  filterItems?: MultiFilterItem;
  // pass vnodes from plugins
  extraContent?: (data: ShowData) => any;
} & FilterItem & Omit<ColumnRegular, 'filter'>;
