/* eslint-disable */
/* tslint:disable */
// @ts-ignore
import { VNode } from '@stencil/core';
// @ts-ignore
import { ObservableMap, Subscription } from '@stencil/store';

export type Observable<T> = ObservableMap<T>;
export type PluginSubscribe<T> = Subscription<T>;

export declare namespace RevoGrid {
  // --------------------------------------------------------------------------
  //
  //  Dimensions
  //
  // --------------------------------------------------------------------------

  type DimensionTypeRow = 'row';
  type DimensionTypeCol = 'col';

  type DimensionColPin = 'colPinStart' | 'colPinEnd';
  type DimensionRowPin = 'rowPinStart' | 'rowPinEnd';

  type DimensionType = DimensionTypeCol | DimensionTypeRow;

  type DimensionCols = DimensionColPin | DimensionTypeCol;
  type DimensionRows = DimensionTypeRow | DimensionRowPin;

  type MultiDimensionType = DimensionCols | DimensionRows;

  // --------------------------------------------------------------------------
  //
  //  Columns
  //
  // --------------------------------------------------------------------------

  type ColumnDataSchemaModel = {
    // property
    prop: ColumnProp;
    // row model
    model: DataType;
    // column data
    column: ColumnRegular;
    // index in grid datasource
    rowIndex: number;
    // grid datasource
    data: DataSource;
  };

  type ReadOnlyFormat = boolean | ((params: ColumnDataSchemaModel) => boolean);
  type RowDrag = boolean | { (params: ColumnDataSchemaModel): boolean };

  interface ColumnGrouping {
    children: ColumnDataSchema[];
    name: DataFormat;
  }

  interface ColumnProperties {
    /** column inner template */
    columnTemplate?: ColumnTemplateFunc<VNode>;
    /** cell properties */
    columnProperties?: ColPropertiesFunc;
  }

  type ColumnTypes = { [name: string]: RevoGrid.ColumnType };

  interface ColumnType extends ColumnProperties {
    /** is column or cell readonly */
    readonly?: ReadOnlyFormat;
    /** cell properties */
    cellProperties?: PropertiesFunc;
    /** cell inner template */
    cellTemplate?: CellTemplateFunc<VNode>;
    /** default column size */
    size?: number;
    /**
     * minimal column size
     * this property can not be less than cell padding
     * in order to keep performance on top and minimize dom elements number
     */
    minSize?: number;
    /**  max column size */
    maxSize?: number;

    /** represents custom editor defined in @editors property */
    editor?: string | Edition.EditorCtr;
  }

  type Order = 'asc' | 'desc' | undefined;

  interface ColumnRegular extends ColumnType {
    /** mapping to data */
    prop?: ColumnProp;
    /** column pin 'colPinStart'|'colPinEnd' */
    pin?: DimensionColPin;
    /** column header */
    name?: DataFormat;
    /** is column can be sorted */
    sortable?: boolean;
    /** column size would be changed based on content size */
    autoSize?: boolean;
    /** filter */
    filter?: boolean | string | string[];
    order?: Order;
    /** is cell in column or individual can be dragged */
    rowDrag?: RowDrag;

    /** represents type defined in @columnTypes property */
    columnType?: string;

    beforeSetup?(col: ColumnRegular): void;

    [key: string]: any;
  }

  type ColumnDataSchema = ColumnGrouping | ColumnRegular;
  type ColumnData = ColumnDataSchema[];

  type ColumnProp = string | number;
  type DataFormat = any;

  type CellProp = string | number | object | boolean | undefined;
  type CellProps = {
    style?: { [key: string]: string | undefined };
    class?: { [key: string]: boolean } | string;
    [attr: string]: CellProp;
  };

  // --------------------------------------------------------------------------
  //
  //  Create Element function description
  //
  // --------------------------------------------------------------------------

  interface HyperFunc<T> {
    (tag: any): T;
  }
  interface HyperFunc<T> {
    (tag: any, data: any): T;
  }
  interface HyperFunc<T> {
    (tag: any, text: string): T;
  }
  interface HyperFunc<T> {
    (sel: any, children: Array<T | undefined | null>): T;
  }
  interface HyperFunc<T> {
    (sel: any, data: any, text: string): T;
  }
  interface HyperFunc<T> {
    (sel: any, data: any, children: Array<T | undefined | null>): T;
  }
  interface HyperFunc<T> {
    (sel: any, data: any, children: T): T;
  }

  type CellTemplateFunc<T> = (createElement: HyperFunc<T>, props: ColumnDataSchemaModel) => any;
  type ColumnTemplateFunc<T> = (createElement: HyperFunc<T>, props: ColumnRegular) => T | T[] | string;
  type PropertiesFunc = (props: ColumnDataSchemaModel) => CellProps | void | undefined;
  type ColPropertiesFunc = (props: ColumnDataSchema) => CellProps | void | undefined;

  // --------------------------------------------------------------------------
  //
  //  Row data source
  //
  // --------------------------------------------------------------------------

  type DataType = { [T in ColumnProp]: DataFormat };
  type DataSource = DataType[];
  type DataLookup = { [rowIndex: number]: DataType };

  // --------------------------------------------------------------------------
  //
  //  Row definitions
  //
  // --------------------------------------------------------------------------

  type RowDefinition = {
    type: DimensionRows;
    size: number;
    index: number;
  };

  interface RowHeaders extends RevoGrid.ColumnRegular {}

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  type ViewPortResizeEvent = {
    dimension: DimensionType;
    size: number;
  };

  type ViewPortScrollEvent = {
    dimension: DimensionType;
    coordinate: number;
    delta?: number;
  };

  type InitialHeaderClick = {
    index: number;
    originalEvent: MouseEvent;
    column: RevoGrid.ColumnRegular;
  };

  // --------------------------------------------------------------------------
  //
  //  Viewport store
  //
  // --------------------------------------------------------------------------

  type Range = {
    start: number;
    end: number;
  };

  type ViewportStateItems = {
    items: VirtualPositionItem[];
  } & Range;

  interface ViewportState extends ViewportStateItems {
    realCount: number;
    virtualSize: number;
    lastCoordinate: number;
  }

  type ViewSettingSizeProp = Record<string, number>;

  interface VirtualPositionItem extends PositionItem {
    size: number;
  }

  interface PositionItem {
    itemIndex: number;
    start: number;
    end: number;
  }

  // --------------------------------------------------------------------------
  //
  //  Dimension store
  //
  // --------------------------------------------------------------------------

  interface DimensionSettingsState {
    indexes: number[];
    positionIndexes: number[];
    positionIndexToItem: { [position: number]: PositionItem };
    indexToItem: { [index: number]: PositionItem };
    sizes: ViewSettingSizeProp;
    frameOffset: number;
    realSize: number;
    originItemSize: number;
  }
}

// --------------------------------------------------------------------------
//
//  Plugin space
//
// --------------------------------------------------------------------------
export declare namespace RevoPlugin {
  class Plugin {
    constructor(revogrid: HTMLRevoGridElement, ...[]);
    destroy(): void;
  }

  type PluginClass = typeof Plugin;
}

// --------------------------------------------------------------------------
//
//  Selection space
//
// --------------------------------------------------------------------------

export declare namespace Selection {
  type RowIndex = number;
  type ColIndex = number;

  type SelectionStoreState = {
    range: RangeArea | null;
    tempRange: RangeArea | null;
    tempRangeType: string | null;
    focus: Cell | null;

    edit: Edition.EditCellStore | null;
    lastCell: Cell | null;
  };

  type RangeArea = {
    x: ColIndex;
    y: RowIndex;
    x1: ColIndex;
    y1: RowIndex;
  };

  type TempRange = {
    type: string;
    area: RangeArea;
  };

  type ChangedRange = {
    type: RevoGrid.DimensionRows;
    newRange: RangeArea;
    oldRange: RangeArea;
    newProps: RevoGrid.ColumnProp[];
    oldProps: RevoGrid.ColumnProp[];
    newData: { [key: number]: RevoGrid.DataType };
  };

  interface Cell {
    x: ColIndex;
    y: RowIndex;
  }

  type FocusedCells = {
    focus: Selection.Cell;
    end: Selection.Cell;
  };

  type RangeAreaCss = {
    left: string;
    top: string;
    width: string;
    height: string;
  };
}

// --------------------------------------------------------------------------
//
//  Edition space
//
// --------------------------------------------------------------------------

export declare namespace Edition {
  import HyperFunc = RevoGrid.HyperFunc;
  type SaveData = string;
  type SaveDataDetails = {
    row: Selection.RowIndex;
    col: Selection.ColIndex;
    val: any;
    preventFocus?: boolean;
  };

  type BeforeEdit = {
    isCancel: boolean;
  } & Edition.BeforeSaveDataDetails;

  type BeforeSaveDataDetails = {
    prop: RevoGrid.ColumnProp;
    model: RevoGrid.DataType;
    val?: SaveData;
    rowIndex: number;
    type: RevoGrid.DimensionRows;
  };

  type BeforeRangeSaveDataDetails = {
    data: RevoGrid.DataLookup;
    models: { [rowIndex: number]: RevoGrid.DataType };
    type: RevoGrid.DimensionRows;
  };

  interface EditCellStore extends Selection.Cell {
    val?: SaveData;
  }

  type EditCell = EditCellStore & BeforeSaveDataDetails;

  type Editors = { [name: string]: EditorCtr };

  interface EditorCtr {
    new (
      // column data
      column: RevoGrid.ColumnRegular,
      // to save changes
      saveCallback: (value: Edition.SaveData, preventFocus?: boolean) => void,
      // to close editor, if focusNext true, after close editor focus on next cell
      closeCallback: (focusNext?: boolean) => void,
    ): EditorBase;
  }

  interface EditorBase {
    element?: Element | null;
    editCell?: EditCell;
    componentDidRender?(): void;
    disconnectedCallback?(): void;
    render(createElement?: HyperFunc<VNode>): VNode | VNode[] | string | void;
  }
}

export declare namespace ThemeSpace {
  interface ThemePackage {
    defaultRowSize: number;
  }

  type ThemeConfig = {
    rowSize: number;
  };

  type Theme = 'default' | 'material' | 'compact' | 'darkMaterial' | 'darkCompact';
}

export type DimensionStores = {
  [T in RevoGrid.MultiDimensionType]: Observable<RevoGrid.DimensionSettingsState>;
};
export type ViewportStores = {
  [T in RevoGrid.MultiDimensionType]: Observable<RevoGrid.ViewportState>;
};
