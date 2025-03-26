import type { VNode } from '@stencil/core';
import type {
  HyperFunc,
  ColumnProp,
  DimensionRows,
  DataType,
  Providers,
  VirtualPositionItem,
  PositionItem,
} from '@type';
import type { RowProps } from '../../components/data/row-renderer';
import { GROUP_EXPAND_EVENT } from './grouping.const';


interface GroupTemplateProp {
  name: string;
  itemIndex: number;
  expanded: boolean;
  depth: number;
  providers: Providers;
  model?: DataType;
}

export type RowGroupingProps = GroupRowPros & PositionItem & {
  /**
   * Visible columns in the grid, can be used to get the width of the column and position of the column
   * to calculate the position of the cells in the grouping row
   */
  columnItems: VirtualPositionItem[];
};
export interface GroupRowPros extends RowProps {
  model: DataType;
  hasExpand: boolean;
  providers: Providers;
  groupingCustomRenderer?: GroupLabelTemplateFunc | null;
}

export type GroupLabelTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: GroupTemplateProp & RowGroupingProps,
  ...args: any[]
) => any;

export type GroupingOptions = {
  /**
   * Column props to which grouping will be applied
   */
  props?: ColumnProp[];

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

export type ExpandedOptions = {
  /**
   * Currently expanded items. to set expanded: '{ 'a': true, 'a,b': true, 'a,b,c': true }'
   */
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

declare global {
  /**
   * grid.addEventListener(GROUP_EXPAND_EVENT, (e: OnExpandEvent) => {
   *  console.log(e)
   * })
   */
  interface HTMLRevoGridElementEventMap {
    [GROUP_EXPAND_EVENT]: OnExpandEvent;
  }
}