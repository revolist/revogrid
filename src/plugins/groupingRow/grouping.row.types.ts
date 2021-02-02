import { RevoGrid } from '../../interfaces';

export type GroupingOptions = {
  // properties array to group
  props?: RevoGrid.ColumnProp[];
  /** is expanded by default */
  expandedAll?: boolean;
  /** todo
   * choose column prop to which expand button will be applied
   * if not defined first column in grid
   */
  // applyToProp?: RevoGrid.ColumnProp;
  /** 
   * todo
   * choose if render cells in grouping row
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
};
