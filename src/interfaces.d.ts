import {VNode} from "@stencil/core";

export declare namespace RevoGrid {

  // --------------------------------------------------------------------------
  //
  //  Dimensions
  //
  // --------------------------------------------------------------------------

  type DimensionTypeRow = 'row';
  type DimensionTypeCol = 'col';

  type DimensionColPin = 'colPinStart'|'colPinEnd';
  type DimensionRowPin = 'rowPinStart'|'rowPinEnd';

  type DimensionType = DimensionTypeCol|DimensionTypeRow;

  type DimensionCols = DimensionColPin|DimensionTypeCol;
  type DimensionRows = DimensionTypeRow|DimensionRowPin;

  type MultiDimensionType = DimensionCols|DimensionRows;


  // --------------------------------------------------------------------------
  //
  //  Columns
  //
  // --------------------------------------------------------------------------

  type ColumnDataSchemaModel = {
    prop: ColumnProp;
    model: DataType;
    data: DataSource;
    column: ColumnRegular;
  };

  type ReadOnlyFormat = boolean | ((row: number, col: number) => boolean);
  type RowDrag = boolean| {(params: ColumnDataSchemaModel): boolean};


  interface ColumnGrouping {
    children: ColumnDataSchema[];
    name: DataFormat;
  }


  interface ColumnRegular {
    /** mapping to data */
    prop: ColumnProp;
    /** column pin 'colPinStart'|'colPinEnd' */
    pin?: DimensionColPin;
    /** column header */
    name?: DataFormat;
    /** is column or cell readonly */
    readonly?: ReadOnlyFormat;
    /** default column size */
    size?: number;
    /** minimal column size */
    minSize?: number;
    /** is column can be sorted */
    sortable?: boolean;
    order?: 'asc'|'desc';


    /** custom editor key if present */
    editor?: string;

    /** is cell in column or individual can be dragged */
    rowDrag?: RowDrag;

    /** cell properties */
    cellProperties?: PropertiesFunc;
    /** cell inner template */
    cellTemplate?: CellTemplateFunc<VNode>;
    /** column inner template */
    columnTemplate?: ColumnTemplateFunc<VNode>;
    /** cell properties */
    columnProperties?: PropertiesFunc;
  }

  type ColumnDataSchema = ColumnGrouping|ColumnRegular;
  type ColumnData = ColumnDataSchema[];

  type ColumnProp = string|number;
  type DataFormat = any;

  type CellProps = {
    style?: {[key: string]: string | undefined};
    class?: string;
    [attr: string]: string|number|object;
  };


  // --------------------------------------------------------------------------
  //
  //  Create Element function description
  //
  // --------------------------------------------------------------------------

  interface HyperFunc<T> { (tag: string, props?: object, value?: string): T; }
  type CellTemplateFunc<T> = (createElement: HyperFunc<T>, props: ColumnDataSchemaModel) => T;
  type ColumnTemplateFunc<T> = (createElement: HyperFunc<T>, props: ColumnRegular) => T;
  type PropertiesFunc = (props: ColumnDataSchemaModel) => CellProps;


  // --------------------------------------------------------------------------
  //
  //  Row data source
  //
  // --------------------------------------------------------------------------

  type DataType = { [T in ColumnProp]: DataFormat };
  type DataSource = DataType[];


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

  type ViewSettingSizeProp = { [index: string]: number };

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
//  Selection space
//
// --------------------------------------------------------------------------

export declare namespace Selection {
  type RowIndex = number;
  type ColIndex = number;

  type SelectionStoreState = {
    range: RangeArea|null;
    tempRange: RangeArea|null;
    focus: Cell|null;
    edit: Edition.EditCell|null;
    lastCell: Cell|null;
  };

  type RangeArea = {
    x: ColIndex;
    y: RowIndex;
    x1: ColIndex;
    y1: RowIndex;
  };

  type ChangedRange = {
    newRange: { start: Selection.Cell; end: Selection.Cell; };
    oldRange: { start: Selection.Cell; end: Selection.Cell; };
  };

  interface Cell {
    x: ColIndex;
    y: RowIndex;
  }

  export type RangeAreaCss = {
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
    val: SaveData;
  };
  type BeforeSaveDataDetails = {
    prop: RevoGrid.ColumnProp;
    val: SaveData;
    rowIndex: number;
    type: RevoGrid.DimensionRows;
  };

  interface EditCell extends Selection.Cell {
    model?: RevoGrid.DataType;
    val?: SaveData;
  }

  type Editors = {[name: string]: EditorCtr};

  interface EditorCtr {
    new (
        column: RevoGrid.ColumnRegular,
        editCallback?: (value: Edition.SaveData) => void,
    ): EditorBase;
  }

  interface EditorBase {
    element?: Element|null;
    editCell?: EditCell;
    componentDidRender?(): void;
    disconnectedCallback?(): void;
    render(createElement?: HyperFunc<VNode>): VNode;
  }
}
