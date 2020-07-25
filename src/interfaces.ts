/* Note: using `.d.ts` file extension will exclude it from the output build */
// import {EventEmitter} from "@stencil/core";

export type DimensionType = 'col'|'row';

export interface MultiDimensionAction {
  col: ViewSettingSizeProp;
  row: ViewSettingSizeProp;
}

export type ColumnDataSchemaModel = {
  prop: ColumnProp;
  model: DataType;
};

export interface ColumnDataSchema {
  prop: ColumnProp;
  name?: DataFormat;
  cellTemplate?: Function;
}

export type ColumnProp = string|number;
export type DataFormat = string;
export type CellTemplateFunc<T> = (h: (sel: string, data?: object, text?: string) => T, props: ColumnDataSchemaModel) => T;
export type ColumnData = ColumnDataSchema[];

export type DataType = {[T in ColumnProp]: DataFormat} | DataFormat[];

export interface DataSourceState {
  data: DataType[];
  columns: ColumnDataSchema[];
}

export interface ViewportStateItems {
  items: VirtualPositionItem[];
  itemIndexes: number[];
}
export interface ViewportState extends ViewportStateItems {
  realCount: number;
  frameOffset: number;
  virtualSize: number;
}

export type ViewSettingSizeProp = {[index: string]: number};
export interface VirtualPositionItem extends PositionItem {
  size: number;
}

export interface PositionItem {
  itemIndex: number;
  start: number;
  end: number;
}

export interface DimensionSettingsState {
  indexes: number[];
  positionIndexes: number[];
  positionIndexToItem: {[position: number]: PositionItem};
  indexToItem: {[index: number]: PositionItem};
  sizes: ViewSettingSizeProp;
  realSize: number;
  originItemSize: number;
}

export type InitialSettings = {
  defaultColumnSize: number;
  defaultRowSize: number;
  frameSize: number;
  readonly: boolean;
  range: boolean;
  dimensions?: {
    col?: ViewSettingSizeProp;
    row?: ViewSettingSizeProp;
  }
};

export type SaveData = string;
export type SaveDataDetails = {
  row: number;
  col: number;
  val: SaveData;
};
export interface EditorI {
  // save: EventEmitter<SaveData>
}

export type SelectionArea = {
  left: string;
  top: string;
  width: string;
  height: string;
};