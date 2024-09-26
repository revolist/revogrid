import { VNode } from '@stencil/core';
import { DimensionRows, DimensionCols } from './dimension';
import {
  ColumnProp,
  DataType,
  DataLookup,
  HyperFunc,
  ColumnDataSchemaModel,
} from './interfaces';

export type RowIndex = number;
export type ColIndex = number;

/**
 * Represents the state of the selection store.
 * It contains information about the selection range, temporary range,
 * focused cell, editing cell, last focused cell, and next cell to focus.
 */
export type SelectionStoreState = {
  range: RangeArea | null;
  /**
   * Temporary range selection area
   */
  tempRange: RangeArea | null;
  /**
   * Type of the temporary range selection
   */
  tempRangeType: string | null;
  /**
   * Focused cell coordinate
   */
  focus: Cell | null;
  /**
   * Editing cell store
   */
  edit: EditCellStore | null;
  /**
   * Last cell which was focused
   */
  lastCell: Cell | null;
  /**
   * Next cell to focus
   */
  nextFocus: Cell | null;
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
  newRange: RangeArea; // new range to apply
  oldRange: RangeArea; // range to copy from
  mapping: OldNewRangeMapping;
  newData: {
    [key: number]: DataType;
  };
};

/**
 * Cell coordinates
 */
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

export interface BeforeSaveDataDetails extends ColumnDataSchemaModel {
  /**
   * Value from editor to save, not part of the model value yet
   */
  val?: SaveData;
}

export type BeforeRangeSaveDataDetails = {
  data: DataLookup;
  models: Partial<DataLookup>;
  type: DimensionRows;
};

export type AfterEditEvent = BeforeRangeSaveDataDetails | BeforeSaveDataDetails;

/**
 * Edit cell info for store
 */
export interface EditCellStore extends Cell {
  val?: SaveData;
}
/**
 * Edit cell info for editor
 */
export type EditCell = EditCellStore & BeforeSaveDataDetails;

/**
 * Available editors in grid
 */
export type Editors = {
  [name: string]: EditorCtr;
};

/**
 * Editor component
 */
export type EditorCtr = EditorCtrCallable | EditorCtrConstructible;


/**
 * Editor component callable function
 */
export type EditorCtrCallable = {
  (
    column: ColumnDataSchemaModel,
    save: (value: SaveData, preventFocus?: boolean) => void,
    close: (focusNext?: boolean) => void,
  ): EditorBase;
}
/**
 * Editor component constructible class
 */
export interface EditorCtrConstructible {
  new (
    column: ColumnDataSchemaModel,
    save: (value: SaveData, preventFocus?: boolean) => void,
    close: (focusNext?: boolean) => void,
  ): EditorBase;
}

/**
 * Editor interface
 */
export interface EditorBase {
  element?: Element | null;
  editCell?: EditCell;
  /**
   * Autosave usage when you want to return value for models.
   */
  getValue?(): any;
  /**
   * For Editor plugin internal usage.
   * Prevents Editor save. Manual save usage required.
   */
  beforeAutoSave?(val?: any): boolean;
  beforeUpdate?(): void;
  /**
   * Before editor got disconnected.
   * Can be triggered multiple times before actual disconnect.
   */
  beforeDisconnect?(): void;
  componentDidRender?(): void;
  disconnectedCallback?(): void;
  render(
    createElement: HyperFunc<VNode>,
    additionalData?: any,
  ): VNode | VNode[] | string | void;
}
