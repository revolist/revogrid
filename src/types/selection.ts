import { VNode } from '@stencil/core';
import { DimensionRows, DimensionCols } from './dimension';
import {
  ColumnProp,
  DataType,
  DataLookup,
  ColumnRegular,
  HyperFunc,
} from './interfaces';

export type RowIndex = number;
export type ColIndex = number;
export type SelectionStoreState = {
  range: RangeArea | null;
  tempRange: RangeArea | null;
  tempRangeType: string | null;
  focus: Cell | null;
  edit: EditCellStore | null;
  lastCell: Cell | null;
};
export type RangeArea = {
  x: ColIndex;
  y: RowIndex;
  x1: ColIndex;
  y1: RowIndex;
};
export type TempRange = {
  type: string;
  area: RangeArea;
};
export type OldNewRangeMapping = {
  [rowIndex: number]: {
    [T in ColumnProp]: {
      rowIndex: number;
      colIndex: number;
      colProp: ColumnProp;
    };
  };
};
export type ChangedRange = {
  type: DimensionRows;
  colType: DimensionCols;
  newRange: RangeArea;
  oldRange: RangeArea;
  mapping: OldNewRangeMapping;
  newData: {
    [key: number]: DataType;
  };
};
export interface Cell {
  x: ColIndex;
  y: RowIndex;
}
export type FocusedCells = {
  focus: Cell;
  end: Cell;
};
export type RangeAreaCss = {
  left: string;
  top: string;
  width: string;
  height: string;
};

export type SaveData = string;
export type SaveDataDetails = {
  rgRow: RowIndex;
  rgCol: ColIndex;
  type: DimensionRows;
  prop: ColumnProp;
  val: any;
  preventFocus?: boolean;
};

export type BeforeEdit = BeforeSaveDataDetails;

export type BeforeSaveDataDetails = {
  prop: ColumnProp;
  model: DataType;
  val?: SaveData;
  rowIndex: number;
  colIndex: number;
  colType: DimensionCols;
  type: DimensionRows;
};
export type BeforeRangeSaveDataDetails = {
  data: DataLookup;
  models: {
    [rowIndex: number]: DataType;
  };
  type: DimensionRows;
};
export interface EditCellStore extends Cell {
  val?: SaveData;
}
export type EditCell = EditCellStore & BeforeSaveDataDetails;
export type Editors = {
  [name: string]: EditorCtr;
};
export interface EditorCtr {
  new (
    column: ColumnRegular,
    saveCallback: (value: SaveData, preventFocus?: boolean) => void,
    cancelEditCallback: (focusNext?: boolean) => void,
  ): EditorBase;
}
export interface EditorBase {
  element?: Element | null;
  editCell?: EditCell;
  // autosave usage when you want to return value for models
  getValue?(): any;
  // for editor plugin internal usage in case you want to stop auto save and use your own
  beforeAutoSave?(val?: any): boolean;
  beforeUpdate?(): void;
  componentDidRender?(): void;
  disconnectedCallback?(): void;
  render(
    createElement?: HyperFunc<VNode>,
    additionalData?: any,
  ): VNode | VNode[] | string | void;
}
