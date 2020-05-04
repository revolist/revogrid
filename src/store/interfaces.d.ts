type DimensionType = 'col'|'row';

interface MultiDimensionAction {
  col: ViewSettingSizeProp;
  row: ViewSettingSizeProp;
}

type ColumnDataSchemaModel = {
  prop: ColumnProp;
  model: DataType;
};

interface ColumnDataSchema {
  prop: ColumnProp;
  name?: DataFormat;
  cellTemplate?: Function;
}

type ColumnProp = string|number;
type DataFormat = string;
type CellTemplateFunc<T> = (h: (sel: string, data?: object, text?: string) => T, props: ColumnDataSchemaModel) => T;
type ColumnData = ColumnDataSchema[];
type DataType = {[key: string]: DataFormat};

type ViewportVisibleItems = VirtualPositionItem[];


interface DataSourceState {
  data: DataType[];
  columns: ColumnDataSchema[];
}

interface ViewportStateItems {
  items: ViewportVisibleItems;
  itemIndexes: number[];
}
interface ViewportState extends ViewportStateItems {
  realCount: number;
  frameOffset: number;
  virtualSize: number;
}

type ViewSettingSizeProp = {[index: string]: number};
interface VirtualPositionItem extends PositionItem {
  size: number;
}
interface PositionItem {
  itemIndex: number;
  start: number;
  end: number;
}

interface DimensionSettingsState {
  indexes: number[];
  positionIndexes: number[];
  positionIndexToCoordinate: {[position: number]: PositionItem};
  itemIndexToCoordinate: {[position: number]: PositionItem};
  sizes: ViewSettingSizeProp;
  realSize: number;
  originItemSize: number;
}

type InputSettings = {
  defaultColumnSize: number;
  defaultRowSize: number;
  frameSize: number;
  dimensions?: {
    col?: ViewSettingSizeProp;
    row?: ViewSettingSizeProp;
  }
};

