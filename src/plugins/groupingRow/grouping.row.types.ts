import { VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

export type GroupLabelTemplateFunc = (
  createElement: RevoGrid.HyperFunc<VNode>,
  props: { name: string; itemIndex: number; expanded: boolean; depth: number; },
) => any;

export type GroupingOptions = {
  // properties array to group
  props?: RevoGrid.ColumnProp[];
  /** is expanded by default */
  expandedAll?: boolean;
  // custom group label
  groupLabelTemplate?: GroupLabelTemplateFunc;
  /** todo
   * choose column prop to which expand button will be applied
   * if not defined first column in grid
   */
  // applyToProp?: RevoGrid.ColumnProp;
  /**
   * todo
   * choose if render cells in grouping rgRow
   * true by default
   */
  // fullRow?: boolean;
};

export type BeforeSourceSetEvent = {
  type: RevoGrid.DimensionRows;
  source: RevoGrid.DataType[];
};

export type OnExpandEvent = {
  model: RevoGrid.DataType;
  virtualIndex: number;
};

export type SourceGather = {
  source: RevoGrid.DataType[];
  prevExpanded: Record<string, boolean>;
  oldNewIndexes?: Record<number, number>;
};
