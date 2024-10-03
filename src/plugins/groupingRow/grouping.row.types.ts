import type { VNode } from '@stencil/core';
import type { HyperFunc, ColumnProp, DimensionRows, DataType } from '@type';

export type GroupLabelTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: { name: string; itemIndex: number; expanded: boolean; depth: number; },
) => any;

export type GroupingOptions = {
  // properties array to group
  props?: ColumnProp[];
  /** is expanded by default */
  expandedAll?: boolean;
  // custom group label
  groupLabelTemplate?: GroupLabelTemplateFunc;
  /** todo
   * choose column prop to which expand button will be applied
   * if not defined first column in grid
   */
  // applyToProp?: ColumnProp;
  /**
   * todo
   * choose if render cells in grouping rgRow
   * true by default
   */
  // fullRow?: boolean;
};

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
