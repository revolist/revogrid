import type { VNode } from '@stencil/core';
import type {
  HyperFunc,
  ColumnProp,
  DimensionRows,
  DataType,
  Providers,
  VirtualPositionItem,
  PositionItem,
  DimensionCols,
  CellTemplateProp,
} from '@type';
import type { RowProps } from '../../components/data/row-renderer';
import { GROUP_EXPAND_EVENT } from './grouping.const';

/**
 * Properties for the grouping row template
 */
interface GroupTemplateProp {
  /**
   * Name of the grouping row
   */
  name: string;
  /**
   * Index of the grouping row
   */
  itemIndex: number;
  /**
   * Expanded state of the grouping row
   */
  expanded: boolean;
  /**
   * Depth of the grouping row
   */
  depth: number;
  /**
   * Providers for the grid
   */
  providers: Providers;
  /**
   * Dimension type (e.g. rgCol, colPinStart, colPinEnd, rowHeaders)
   */
  colType: DimensionCols | 'rowHeaders';
  /**
   * Model of the grouping row
   */
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
  groupingCellRenderer?: GroupCellTemplateFunc | null;
  additionalData?: any;
}

export type GroupLabelTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: GroupTemplateProp & RowGroupingProps,
  ...args: any[]
) => any;

export interface GroupCellTemplateProp
  extends Omit<CellTemplateProp, 'colType'> {
  /**
   * Column viewport type that owns the cell.
   */
  colType: DimensionCols | 'rowHeaders';
  /**
   * Current virtual column position. Only columns rendered by the viewport are
   * passed to the group cell template.
   */
  columnItem: VirtualPositionItem;
  /**
   * Current virtual row position.
   */
  rowItem: VirtualPositionItem;
  /**
   * Semantic information about the synthetic group row.
   */
  group: {
    name: string;
    depth: number;
    expanded: boolean;
    prop: ColumnProp;
    isLabelColumn: boolean;
    canExpand: boolean;
    onExpand(event: MouseEvent): void;
  };
}

export type GroupCellTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: GroupCellTemplateProp,
  additionalData?: any,
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
  /**
   * Custom template for cells in synthetic group rows.
   * When provided, group rows render only the columns in the current horizontal
   * viewport and this template takes precedence over `groupLabelTemplate`.
   */
  groupCellTemplate?: GroupCellTemplateFunc;
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
   * Replacement group value for `null` and `undefined` keys.
   * Used by the default group value resolver.
   * @default ''
   */
  emptyGroupValue?: any;
  /**
   * Custom group label template
   */
  groupLabelTemplate?: GroupLabelTemplateFunc;
  /**
   * Custom template for virtualized cells in synthetic group rows.
   */
  groupCellTemplate?: GroupCellTemplateFunc;
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
