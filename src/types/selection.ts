import { type VNode } from '@stencil/core';
import type { DimensionRows, DimensionCols } from './dimension';
import type {
  ColumnProp,
  DataType,
  DataLookup,
  HyperFunc,
  ColumnDataSchemaModel,
  PositionItem,
} from './interfaces';

// Virtual index of row
export type RowIndex = number;
// Virtual index of row
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
   * The last real coordinate + 1
   */
  lastCell: Cell | null;
  /**
   * Next cell to focus
   */
  nextFocus: Cell | null;
};

// Virtual index of row (y) and column (x)
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
  [newRowIndex: number]: {
    [T in ColumnProp]: { // new column prop
      rowIndex: number; // Virtual index of original row
      colIndex: number; // Virtual index of original col
      colProp: ColumnProp; // original column prop
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
    [newRowIndex: number]: DataType;
  };
};

/**
 * Cell coordinates
 */
export interface Cell {
  x: ColIndex; // Virtual index of column
  y: RowIndex; // Virtual index of row
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

export type SaveDataDetails = {
  rgRow: RowIndex;  // Virtual index of row
  rgCol: ColIndex; // Virtual index of column
  type: DimensionRows;
  prop: ColumnProp;
  val: any;
  preventFocus?: boolean;
};

export type BeforeEdit = BeforeSaveDataDetails;

export type RowDragStartDetails = {
  cell: Cell;
  text: string;
  pos: PositionItem;
  event: MouseEvent;
  rowType: DimensionRows;
  model: any;
};

export interface BeforeSaveDataDetails extends ColumnDataSchemaModel {
  /**
   * Value from editor to save, not part of the model value yet
   */
  val?: any;
}

export type BeforeRangeSaveDataDetails = {
  data: DataLookup;
  models: Partial<DataLookup>;
  type: DimensionRows;
  newRange: RangeArea | null;
  oldRange: RangeArea | null;
};

export type AfterEditEvent = BeforeRangeSaveDataDetails | BeforeSaveDataDetails;

/**
 * Edit cell info for store
 */
export interface EditCellStore extends Cell {
  val?: any;
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
    save: (value?: any, preventFocus?: boolean) => void,
    close: (focusNext?: boolean) => void,
  ): EditorBase;
}
/**
 * Editor component constructible class
 */
export interface EditorCtrConstructible {
  new (
    column: ColumnDataSchemaModel,
    save: (value: any, preventFocus?: boolean) => void,
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
