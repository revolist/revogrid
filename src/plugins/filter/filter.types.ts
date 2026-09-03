// filter.types.ts

import type { ColumnProp, ColumnRegular, DataType, HyperFunc } from '@type';
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

/** Source-aware context supplied while a filter predicate is evaluated. */
export interface FilterEvaluationContext<
  TModel extends DataType = DataType,
  TColumn extends ColumnRegular = ColumnRegular,
> {
  /** Row model being evaluated. */
  model: TModel;
  /** Column associated with the filter, when one is available. */
  column?: TColumn;
  /** Property the filter is evaluating. */
  property: ColumnProp;
  /** Unparsed value read from the row model. */
  sourceValue: any;
  /** Value after the column cell parser, when configured. */
  parsedValue: any;
  /** Whether the property exists directly on the row model. */
  hasOwnProperty: boolean;
  /** Effective blank policy after grid and column settings are merged. */
  blankSemantics: BlankSemantics;
}

/** Configures which source values are treated as blank by blank operators. */
export interface BlankSemantics {
  null?: boolean;
  undefined?: boolean;
  emptyString?: boolean;
  whitespaceOnlyString?: boolean;
  emptyArray?: boolean;
  missingProperty?: boolean;
  /** Final application override, evaluated after the configured fallback. */
  isBlank?: (
    value: any,
    context: FilterEvaluationContext,
    fallbackResult: boolean,
  ) => boolean;
}

export interface LogicFunction<T1 = LogicFunctionParam, T2 = LogicFunctionExtraParam> {
  (value: T1, extra?: T2, context?: FilterEvaluationContext): boolean;
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
  filterCondition: string;
  removeFilter: string;
  reorderFilter: string;
};

export interface FilterLocalization {
  captions: Partial<FilterCaptions>;
  filterNames: Record<FilterType, string>;
}
/**
 * Filter configuration for a column. This is the type of the `filter` property on a column.
 */
export interface ColumnFilterConfig {
  /** Grid-level blank policy. Individual columns can override fields. */
  blankSemantics?: BlankSemantics;
  /**
   * Whether empty filter panels start with a draft condition. Defaults to true.
   */
  defaultFilter?: boolean;
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

  /**
   * Whether the filter panel allows the same operator more than once per column.
   * Defaults to true to preserve support for repeated conditions in multi-filter expressions.
   */
  allowDuplicateOperators?: boolean;
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
   * Top viewport coordinate of the element the filter panel is anchored to.
   */
  anchorY?: number;
  /**
   * Auto correct position if it is out of document bounds
   */
  autoCorrect?: boolean;
  filterTypes?: Record<string, string[]>;
  /** Preferred operator for an empty panel. */
  defaultFilterType?: string;
  /** Whether an empty panel should create a draft condition. */
  showDefaultFilter?: boolean;
  filterItems?: MultiFilterItem;
  // hide default filters
  hideDefaultFilters?: boolean;
  // pass vnodes from plugins
  extraContent?: (data: ShowData) => any;
  // pass vnodes from plugins before action buttons
  extraBottomContent?: (data: ShowData) => any;
}
