import type { VNode } from '@stencil/core';
import type {
  HyperFunc,
  ColumnProp,
  DimensionRows,
  DataType,
  Providers,
} from '@type';


interface GroupTemplateProp {
  name: string;
  itemIndex: number;
  expanded: boolean;
  depth: number;
  providers: Providers;
  model?: DataType;
}

export type GroupLabelTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: GroupTemplateProp,
  ...args: any[]
) => any;

export type GroupingOptions = {
  /**
   * Column props to which grouping will be applied
   */
  props?: ColumnProp[];

  /**
   * Currently expanded items.
   * Corresponds to prop values as: source = [{ me: 'a' }, { me: 'b' }, { me: 'c' }], to set expanded: { a: true }
   */
  prevExpanded?: Record<string, boolean>;

  /**
   * Is expanded by default
   */
  expandedAll?: boolean;

  /**
   * Should grouping be preserved on source update.
   * default: true
   */
  preserveGroupingOnUpdate?: boolean;
  /**
   * Custom group label template
   */
  groupLabelTemplate?: GroupLabelTemplateFunc;
} & ExpandedOptions;

export type BeforeSourceSetEvent = {
  type: DimensionRows;
  source: DataType[];
};

export type OnExpandEvent = {
  model: DataType;
  virtualIndex: number;
};

export type SourceGather = {
  source: DataType[];
  prevExpanded: Record<string, boolean>;
  oldNewIndexes?: Record<number, number>;
};

export type ExpandedOptions = {
  prevExpanded?: Record<string, boolean>;
  /**
   * Is expanded by default
   */
  expandedAll?: boolean;

  /**
   * Custom group label value parser
   */
  getGroupValue?(item: DataType, prop: string | number): any;
  /**
   * Custom group label template
   */
  groupLabelTemplate?: GroupLabelTemplateFunc;
};
