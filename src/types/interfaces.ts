/* eslint-disable */
/* tslint:disable */
// @ts-ignore
import { VNode } from '@stencil/core';
// @ts-ignore
import { ObservableMap, Subscription } from '@stencil/store';

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
  RangeArea,
  SelectionStoreState,
} from './selection';

export type Observable<T> = ObservableMap<T>;
export type PluginSubscribe<T> = Subscription<T>;

export type ColumnDataSchemaModel = {
  prop: ColumnProp;
  model: DataType;
  column: ColumnRegular;
  rowIndex: number;
  colIndex: number;
  colType: DimensionCols;
  type: DimensionRows;
  data: DataSource;
};
export type CellTemplateProp = {
  providers: Providers;
} & ColumnDataSchemaModel;
export type ReadOnlyFormat =
  | boolean
  | ((params: ColumnDataSchemaModel) => boolean);
export type RowDrag =
  | boolean
  | {
      (params: ColumnDataSchemaModel): boolean;
    };
export interface ColumnGrouping {
  children: ColumnDataSchema[];
  name: DataFormat;
}
export interface ColumnProperties {
  /** column inner template */
  columnTemplate?: ColumnTemplateFunc;
  /** cell properties */
  columnProperties?: ColPropertiesFunc;
}
export type ColumnTypes = {
  [name: string]: ColumnType;
};
export interface CellTemplate {
  // TODO: Add Promise support for template and all custom function so user will be able to use async render on the light speed
  (
    createElement: HyperFunc<VNode>,
    props: CellTemplateProp,
    additionalData?: any,
  ): any;
}
export interface ColumnType extends ColumnProperties {
  /** is column or cell readonly */
  readonly?: ReadOnlyFormat;
  /** cell properties */
  cellProperties?: PropertiesFunc;
  /** cell inner template, now template is async */
  cellTemplate?: CellTemplate;
  /** cell compare function */
  cellCompare?: CellCompareFunc;
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
  editor?: string | EditorCtr;
}
export type Order = 'asc' | 'desc' | undefined;
export interface ColumnRegular extends ColumnType {
  // mapping to data, it's object keys/props, @required used for indexing
  prop: ColumnProp;
  // column pin 'colPinStart'|'colPinEnd'
  pin?: DimensionColPin;
  // column header
  name?: DataFormat;
  // is column can be sorted
  sortable?: boolean;
  // column size would be changed based on content size
  autoSize?: boolean;
  // filter
  filter?: boolean | string | string[];
  order?: Order;
  // is cell in column or individual can be dragged
  rowDrag?: RowDrag;
  // represents type defined in @columnTypes property
  columnType?: string;
  // called before column applied to the store
  beforeSetup?(rgCol: ColumnRegular): void;
  // other keys
  [key: string]: any;
}
export type ColumnDataSchema = ColumnGrouping | ColumnRegular;
export type ColumnData = ColumnDataSchema[];
export type ColumnTemplateProp = ColumnRegular & {
  providers: Providers<DimensionCols | 'rowHeaders'>;
  index: number;
};
export type ColumnPropProp = ColumnGrouping | ColumnTemplateProp;
// Regularly all column are indexed by prop
export type ColumnProp = string | number;
export type DataFormat = any;
export type CellProp = string | number | object | boolean | undefined;
export type CellProps = {
  style?: {
    [key: string]: string | undefined;
  };
  class?:
    | {
        [key: string]: boolean;
      }
    | string;
  [attr: string]: CellProp;
};
export type Providers<T = DimensionRows> = {
  type: T;
  data: Observable<DataSourceState<any, any>> | ColumnRegular[];
  viewport: Observable<ViewportState>;
  dimension: Observable<DimensionSettingsState>;
  selection: Observable<SelectionStoreState>;
};
export interface HyperFunc<T> {
  (tag: any): T;
}
export interface HyperFunc<T> {
  (tag: any, data: any): T;
}
export interface HyperFunc<T> {
  (tag: any, text: string): T;
}
export interface HyperFunc<T> {
  (sel: any, children: Array<T | undefined | null>): T;
}
export interface HyperFunc<T> {
  (sel: any, data: any, text: string): T;
}
export interface HyperFunc<T> {
  (sel: any, data: any, children: Array<T | undefined | null>): T;
}
export interface HyperFunc<T> {
  (sel: any, data: any, children: T): T;
}
export type FocusTemplateFunc = (
  createElement: HyperFunc<VNode>,
  detail: FocusRenderEvent,
) => any;
export type CellCompareFunc = (
  prop: ColumnProp,
  a: DataType,
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
export type DataSource = DataType[];
export type DataLookup = {
  [rowIndex: number]: DataType;
};
export type RowDefinition = {
  type: DimensionRows;
  size: number;
  index: number;
};
export interface RowHeaders extends ColumnRegular {}
export type ViewPortResizeEvent = {
  dimension: DimensionType;
  size: number;
  rowHeader?: boolean;
};
export type ViewPortScrollEvent = {
  dimension: DimensionType;
  coordinate: number;
  delta?: number;
  outside?: boolean;
};
export type InitialHeaderClick = {
  index: number;
  originalEvent: MouseEvent;
  column: ColumnRegular;
};
export type Range = {
  start: number;
  end: number;
};
export type ViewportStateItems = {
  items: VirtualPositionItem[];
} & Range;
export interface ViewportState extends ViewportStateItems {
  realCount: number;
  virtualSize: number;
}
export type ViewSettingSizeProp = Record<string, number>;
export interface VirtualPositionItem extends PositionItem {
  size: number;
}
export type DataSourceState<
  T extends DataType | ColumnRegular,
  ST extends DimensionRows | DimensionCols,
> = {
  // items - index based array for mapping to source tree
  items: number[];
  // all items, used as proxy for sorting, trimming and others
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
export interface DimensionCalc {
  indexes: number[];
  count: number;
  positionIndexes: number[];
  positionIndexToItem: {
    [position: number]: PositionItem;
  };
  indexToItem: {
    [index: number]: PositionItem;
  };
  trimmed: Record<any, any>;
  sizes: ViewSettingSizeProp;
}
export interface DimensionSettingsState extends DimensionCalc {
  realSize: number;
  originItemSize: number;
}

export type DimensionStores = {
  [T in MultiDimensionType]: Observable<DimensionSettingsState>;
};

export type ViewportStores = {
  [T in MultiDimensionType]: Observable<ViewportState>;
};

export type DragStartEvent = {
  originalEvent: MouseEvent;
  model: ColumnDataSchemaModel;
};

export interface BeforeCellRenderEvent<T = any> extends AllDimensionType {
  column: VirtualPositionItem;
  row: VirtualPositionItem;
  model: T;
}

export interface BeforeRowRenderEvent<T = any> extends AllDimensionType {
  dataItem: T;
  item: VirtualPositionItem;
  node: VNode;
}

export type AfterRendererEvent = {
  type: DimensionType;
};

export interface AllDimensionType {
  rowType: DimensionRows;
  colType: DimensionCols;
}

export type ApplyFocusEvent = AllDimensionType & FocusedCells;
export interface FocusRenderEvent extends AllDimensionType {
  range: RangeArea;
  next?: Partial<Cell>;
}
export type ScrollCoordinateEvent = {
  type: DimensionType;
  coordinate: number;
};
