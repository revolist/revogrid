import type { VNode } from '@stencil/core';

import {
  DimensionCols,
  DimensionRows,
  DimensionColPin,
  DimensionType,
  MultiDimensionType,
} from './dimension';
import {
  Cell,
  EditorCtr,
  FocusedCells,
  OldNewRangeMapping,
  RangeArea,
  SelectionStoreState,
} from './selection';
import type { Observable } from '../utils/store.utils';

export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Advanced column data schema model.
 * Used for transpassing data to cell renderer and editor.
 */
export type ColumnDataSchemaModel = {
  /**
   * Column prop used for mapping value to cell from data source model/row
   */
  prop: ColumnProp;
  /**
   * Row data object
   */
  model: DataType;
  /**
   * Column data object
   */
  column: ColumnRegular;
  /**
   * Index of the row in the viewport
   */
  rowIndex: number;
  /**
   * Index of the column in the viewport
   */
  colIndex: number;
  /**
   * Column type based on viewport
   */
  colType: DimensionCols;
  /**
   * Row type based on viewport
   */
  type: DimensionRows;
  /**
   * Row models based on viewport
   */
  data: DataType[];
  /**
   * Current cell data
   */
  value: any;
};
/**
 * Template property for each cell, extends the column data schema model.
 * Additionally, it provides access to the providers injected into the template.
 */
export interface CellTemplateProp extends ColumnDataSchemaModel {
  /**
   * Providers injected into the template
   */
  providers: Providers;
}
/**
 * The ReadOnlyFormat type is a boolean value or a function that takes ColumnDataSchemaModel
 * as a parameter and returns a boolean value.
 *
 * If it is a boolean value, it represents whether the cell in question is read-only.
 * If it is a function, it returns whether the cell in question is read-only based on the provided
 * ColumnDataSchemaModel.
 */
export type ReadOnlyFormat =
  | boolean
  | ((params: ColumnDataSchemaModel) => boolean);
export type RowDrag =
  | boolean
  | {
      (params: ColumnDataSchemaModel): boolean;
    };
/**
 * `ColumnGrouping` type is used to define a grouping in a column.
 */
export type ColumnGrouping = {
  /**
   * An array of objects that represent the children of the grouping.
   */
  children: (ColumnGrouping | ColumnRegular)[];
  /**
   * A `DataFormat` object that represents the name of the grouping.
   */
  name: DataFormat;
};
/**
 * Configuration for header inner template properties
 */
export interface ColumnProperties {
  /**
   * Header inner template
   * Function/component to render custom header content
   */
  columnTemplate?: ColumnTemplateFunc;
  /**
   * Header Cell properties
   * Custom function/component to render header properties
   */
  columnProperties?: ColPropertiesFunc;
}
/**
 * Type that represents a collection of column types.
 * The keys are the names of the column types and the values are the corresponding column type objects.
 */
export type ColumnTypes = {
  /**
   * The name of the column type.
   */
  [name: string]: ColumnType;
};

/**
 * Interface for custom cell renderer.
 */
export interface CellTemplate {
  // TODO: Add Promise support for template and all custom function so user will be able to use async render on the light speed
  (
    createElement: HyperFunc<VNode>,
    props: CellTemplateProp,
    additionalData?: any,
  ): any;
}
/**
 * Interface for regular column definition.
 * Regular column can be any column that is not a grouping column.
 */
export interface ColumnType extends ColumnProperties {
  /**
   * Represents whether the column or cell is read-only.
   * Can be a boolean or a function that returns a boolean.
   * The function receives column data as a parameter.
   */
  readonly?: ReadOnlyFormat;
  /**
   * Represents the default column size.
   */
  size?: number;
  /**
   * Represents the minimal column size.
   * This property cannot be less than cell padding
   * in order to keep performance on top and minimize DOM elements number.
   */
  minSize?: number;
  /**
   * Represents the maximum column size.
   */
  maxSize?: number;
  /**
   * Represents a custom editor defined in @editors property.
   * Can be a string or an editor constructor function.
   */
  editor?: string | EditorCtr;
  /**
   * Represents cell properties for custom styling, classes, and events.
   */
  cellProperties?: PropertiesFunc;
  /**
   * Represents the cell template for custom rendering.
   */
  cellTemplate?: CellTemplate;
  /**
   * Represents the cell compare function for custom sorting.
   */
  cellCompare?: CellCompareFunc;
}
export type Order = 'asc' | 'desc' | undefined;
/**
 * Interface for regular column definition.
 * Regular column can be any column that is not a grouping column.
 * 
 */
/**
 * ColumnRegular interface represents regular column definition.
 * Regular column can be any column that is not a grouping column.
 */
export interface ColumnRegular extends ColumnType {
  /**
   * Column prop used for mapping value to cell from data source model/row, used for indexing.
   */
  prop: ColumnProp;
  /**
   * Column pin 'colPinStart'|'colPinEnd'.
   */
  pin?: DimensionColPin;
  /**
   * Column header text.
   */
  name?: DataFormat;
  /**
   * Column size would be changed based on space left.
   */
  autoSize?: boolean;
  /**
   * Filter. Require filter plugin to be installed and activated through grid config @filter.
   */
  filter?: boolean | string | string[];
  /**
   * Is column can be sorted, check @cellCompare function for custom sorting.
   */
  sortable?: boolean;
  /**
   * Sort order.
   */
  order?: Order;
  /**
   * Is cell in column or individual can be dragged.
   */
  rowDrag?: RowDrag;
  /**
   * Represents type defined in @columnTypes property through grid config.
   */
  columnType?: string;
  /**
   * Function called before column applied to the store.
   */
  beforeSetup?(rgCol: ColumnRegular): void;
  /**
   * Additional properties can be added to the column definition.
   */
  [key: string]: any;
}

export type ColumnData = (ColumnGrouping | ColumnRegular)[];
/**
 * Column template property.
 * Contains extended properties for column.
 */
export interface ColumnTemplateProp extends ColumnRegular {
  /**
   * Providers injected into the template.
   */
  providers: Providers<DimensionCols | 'rowHeaders'>;
  /**
   * Index of the column, used for mapping value to cell from data source model/row.
   */
  index: number;
};

export type ColumnPropProp = ColumnGrouping | ColumnTemplateProp;
// Column prop used for mapping value to cell from data source model/row, used for indexing.
export type ColumnProp = string | number;

export type DataFormat = any;

export type CellProp = string | number | object | boolean | undefined;

/**
 * Additional properties applied to the cell.
 * Contains style object where key is CSS property and value is CSS property value.
 * Contains class object where key is CSS class and value is boolean flag indicating if class should be applied.
 * Contains additional properties for custom cell rendering.
 */
export type CellProps = {
  // CSS styles applied to the cell
  style?: {
    [key: string]: string | undefined;
  };
  // CSS classes applied to the cell
  class?:
    | {
        // CSS class name
        [key: string]: boolean;
      }
    | string;
  // Additional properties for custom cell rendering
  [attr: string]: CellProp;
};

/**
 * Providers for grid which are going to be injected into each cell template
 */
export type Providers<T = DimensionRows> = {
  /**
   * Dimension type (e.g. row or column)
   */
  type: T;
  /**
   * Flag indicating if grid is in readonly mode
   */
  readonly: boolean;
  /**
   * Data source store
   */
  data: Observable<DataSourceState<any, any>> | ColumnRegular[];
  /**
   * Viewport store
   */
  viewport: Observable<ViewportState>;
  /**
   * Dimension store
   */
  dimension: Observable<DimensionSettingsState>;
  /**
   * Selection store
   */
  selection: Observable<SelectionStoreState>;
};
/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  // (tag: any): T;
  (tag: any): T;
}
/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (tag: any, data: any): T;
}
/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (tag: any, text: string): T;
}

/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (sel: any, children: Array<T | undefined | null>): T;
}

/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (sel: any, data: any, text: string): T;
}

/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (sel: any, data: any, children: Array<T | undefined | null>): T;
}

/**
 * `HyperFunc` is a function that takes an HTML tag or component, and returns a
 * JSX element. This function is used to create JSX elements in a context where
 * JSX is not valid.
 */
export interface HyperFunc<T> {
  (sel: any, data: any, children: T): T;
}
/**
 * `FocusTemplateFunc` is a function that takes an HTML tag or component, and
 * returns a JSX element. This function is used to create JSX elements in a
 * context where JSX is not valid.
 */
export type FocusTemplateFunc = (
  createElement: HyperFunc<VNode>,
  detail: FocusRenderEvent,
) => any;


/**
 * `CellCompareFunc` is a function that takes the column property to compare,
 * the data of the first cell, and the data of the second cell. It returns a
 * number indicating the relative order of the two cells.
 */
export type CellCompareFunc = (
  // The column property to compare.
  prop: ColumnProp,
  // The data of the first cell.
  a: DataType,
  // The data of the second cell.
  b: DataType,
) => number;
export type ColumnTemplateFunc = (
  createElement: HyperFunc<VNode>,
  props: ColumnTemplateProp,
  additionalData?: any,
) => any;
export type PropertiesFunc = (
  props: ColumnDataSchemaModel,
) => CellProps | void | undefined;
export type ColPropertiesFunc = (
  props: ColumnPropProp,
) => CellProps | void | undefined;
export type DataType = {
  [T in ColumnProp]: DataFormat;
};

export type DataLookup = {
  [rowIndex: number]: DataType;
};
/**
 * `RowDefinition` is a type that represents a row definition in the
 * viewport.
 */
export type RowDefinition = {
  /**
   * The type of the row.
   */
  type: DimensionRows;
  /**
   * The size of the row.
   */
  size: number;
  /**
   * The index of the row.
   */
  index: number;
};
export interface RowHeaders extends ColumnRegular {}
/**
 * `ViewPortResizeEvent` is an object that contains information about a resize
 * event in the viewport.
 */
export type ViewPortResizeEvent = {
  /* The dimension of the viewport being resized. */
  dimension: DimensionType;
  /* The new size of the viewport. */
  size: number;
  /* Indicates whether the resize event is for a row header. */
  rowHeader?: boolean;
};

/**
 * `ViewPortScrollEvent` is an object that contains information about a scroll
 * event in the viewport.
 */
export type ViewPortScrollEvent = {
  /**
   * The dimension of the viewport being scrolled.
   */
  dimension: DimensionType;
  /**
   * The coordinate of the scroll event.
   */
  coordinate: number;
  /**
   * The change in coordinate between scroll events.
   */
  delta?: number;
  /**
   * Indicates whether the scroll event occurred outside the viewport.
   */
  outside?: boolean;
};

/**
 * `InitialHeaderClick` represents the information needed to handle a click
 * event on the initial column header.
 */
export type InitialHeaderClick = {
  /**
   * The index of the column header that was clicked.
   */
  index: number;
  /**
   * The original mouse event that triggered the click.
   */
  originalEvent: MouseEvent;
  /**
   * The column that was clicked.
   */
  column: ColumnRegular;
  providers: Providers<DimensionCols | 'rowHeaders'>;
};

/**
 * `Range` is an object that represents a range of values.
 */
export type Range = {
  /**
   * The start of the range.
   */
  start: number;
  /**
   * The end of the range.
   */
  end: number;
};

/**
 * `ViewportStateItems` is an object that represents the items in a viewport
 * along with their corresponding range.
 */
export type ViewportStateItems = {
  /**
   * The items in the viewport.
   */
  items: VirtualPositionItem[];
} & Range;

/**
 * `ViewportState` is an object that represents the state of a viewport.
 */
export interface ViewportState extends ViewportStateItems {
  /**
   * The number of real items in the viewport.
   */
  realCount: number;
  /**
   * The virtual size of the viewport.
   */
  virtualSize: number;
}

/**
 * `ViewSettingSizeProp` is a record that maps column or row indexes to their
 * corresponding sizes.
 */
export type ViewSettingSizeProp = Record<string, number>;

/**
 * `VirtualPositionItem` is an object that represents a virtual position item
 * in the viewport.
 */
export interface VirtualPositionItem extends PositionItem {
  /**
   * The size of the virtual position item.
   */
  size: number;
}
export type DataSourceState<
  T extends DataType | ColumnRegular,
  ST extends DimensionRows | DimensionCols,
> = {
  // items - index based array for mapping to source tree
  items: number[];
  // all items, used as proxy for sorting, trimming and others manipulations
  proxyItems: number[];
  // original data source
  source: T[];
  // grouping
  groupingDepth: number;
  groups: Record<any, any>;
  // data source type
  type: ST;
  // trim data, to hide entities from visible data source
  trimmed: Record<any, any>;
};
export interface PositionItem {
  itemIndex: number;
  start: number;
  end: number;
}
/**
 * Object containing information about calculated dimensions.
 * Used for both columns and rows.
 */
export interface DimensionCalc {
  /**
   * Array of indexes of visible items.
   */
  indexes: number[];

  /**
   * Count of visible items.
   */
  count: number;

  /**
   * Array of indexes of visible items.
   * Used for mapping items to their position in DOM.
   */
  positionIndexes: number[];

  /**
   * Mapping of position to item.
   * Used for mapping position in DOM to item.
   */
  positionIndexToItem: {
    /**
     * Position in DOM.
     */
    [position: number]: PositionItem;
  };

  /**
   * Mapping of index to item.
   * Used for mapping index in data source to item.
   */
  indexToItem: {
    /**
     * Index in data source.
     */
    [index: number]: PositionItem;
  };

  /**
   * Object containing information about trimmed data.
   * Used for hiding entities from visible data source.
   */
  trimmed: Record<any, any>;

  /**
   * Object containing size for each visible item.
   */
  sizes: ViewSettingSizeProp;
}
/**
 * Represents the settings state of a dimension.
 * It extends the calculation properties of a dimension.
 * It also includes the real size and origin item size of the dimension.
 */
export interface DimensionSettingsState extends DimensionCalc {
  /**
   * Represents the real size of the dimension.
   */
  realSize: number;

  /**
   * Represents the origin item size of the dimension.
   */
  originItemSize: number;
}

/**
 * Represents the mapping of dimension types to their corresponding observable stores.
 */
export type DimensionStores = {
  [T in MultiDimensionType]: Observable<DimensionSettingsState>;
};

/**
 * Represents the mapping of dimension types to their corresponding observable stores for the viewport.
 */
export type ViewportStores = {
  [T in MultiDimensionType]: Observable<ViewportState>;
};

/**
 * Represents the event object that is emitted when the drag operation starts.
 */
export interface DragStartEvent {
  /**
   * Represents the original mouse event that triggered the drag operation.
   */
  originalEvent: MouseEvent;

  /**
   * Represents the model of the column being dragged.
   */
  model: ColumnDataSchemaModel;
}

/**
 * Represents the event object that is emitted before cell rendering.
 * It includes information about the dimension type, column, row, and model.
 */
export interface BeforeCellRenderEvent<T = any> extends AllDimensionType {
  /**
   * Represents the column being rendered.
   */
  column: VirtualPositionItem;

  /**
   * Represents the row being rendered.
   */
  row: VirtualPositionItem;

  /**
   * Represents the model being rendered.
   */
  model: T;
}

/**
 * Represents the event object that is emitted before row rendering.
 * It includes information about the dimension type, data item, item, and node.
 */
export interface BeforeRowRenderEvent<T = any> extends AllDimensionType {
  /**
   * Represents the data item being rendered.
   */
  model: T;

  /**
   * Represents the item being rendered.
   */
  item: VirtualPositionItem;

  /**
   * Represents the node being rendered.
   */
  node: VNode;
}

/**
 * Represents the event object that is emitted after rendering.
 * It includes information about the dimension type.
 */
export type AfterRendererEvent = {
  /**
   * Represents the type of dimension being rendered.
   */
  type: DimensionType;
};

/**
 * Represents the mapping of dimension types to their corresponding dimension types.
 */
export interface AllDimensionType {
  /**
   * Represents the dimension type for rows.
   */
  rowType: DimensionRows;

  /**
   * Represents the dimension type for columns.
   */
  colType: DimensionCols;
}

/**
 * Represents the event object that is emitted when applying focus.
 * It includes information about the dimension type and focused cells.
 */
export interface ApplyFocusEvent extends AllDimensionType, FocusedCells {}

/**
 * Represents the event object that is emitted before focus rendering.
 * It includes information about the dimension type and range area.
 */
export interface FocusRenderEvent extends AllDimensionType {
  /**
   * Represents the range area of the focus.
   */
  range: RangeArea;

  /**
   * Changes for the next cell to focus. @example { y: -1 }
   */
  next?: Partial<Cell>;
}
/**
 * Represents the event object that is emitted when scrolling occurs.
 * The `type` property indicates the type of dimension (row or column) being scrolled.
 * The `coordinate` property represents the current scroll position in that dimension.
 */
export type ScrollCoordinateEvent = {
  /**
   * Represents the type of dimension being scrolled.
   * Possible values are 'rgRow' and 'rgCol'.
   */
  type: DimensionType;

  /**
   * Represents the current scroll position in the specified dimension.
   * The value is a number representing the coordinate in pixels.
   */
  coordinate: number;
};


/** Range paste. */
export type RangeClipboardPasteEvent = {
  data: DataLookup;
  models: {
    [rowIndex: number]: DataType;
  };
  range: RangeArea | null;
} & AllDimensionType;

/** Range copy. */
export type RangeClipboardCopyEventProps = {
  data: DataFormat[][];
  range: RangeArea;
  mapping: OldNewRangeMapping;
} & AllDimensionType;