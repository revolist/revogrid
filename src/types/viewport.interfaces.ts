import {
  ColumnRegular,
  DataType,
  DimensionSettingsState,
  Observable,
  ViewportState,
} from './interfaces';
import { DSourceState, JSX } from '..';
import { DimensionCols, DimensionRows } from './dimension';
import { Cell, SelectionStoreState, RangeArea, TempRange } from './selection';
import { RowDataSources } from '../services/data.provider';
import { DimensionStoreCollection } from '../store/dimension/dimension.store';
import { ViewportStoreCollection } from '../store/viewport/viewport.store';

export type SlotType = 'content' | 'header' | 'footer';

export type HeaderProperties = Partial<JSX.RevogrHeader>;

export type ViewportColumn = {
  colType: DimensionCols;
  position: Cell;

  uuid: string;
  fixWidth?: boolean;

  viewports: ViewportStoreCollection;
  dimensions: DimensionStoreCollection;

  rowStores: RowDataSources;
  colStore: Observable<DSourceState<ColumnRegular, DimensionCols>>;
} & Partial<JSX.RevogrViewportScroll> &
  Partial<JSX.RevogrHeader>;

export type ViewportData = {
  /** Last cell in data viewport. Indicates borders of viewport */
  lastCell: Cell;

  /** Viewport data position. Position provides connection between independent data stores and Selection store. */
  position: Cell;
  colData: Observable<DSourceState<ColumnRegular, DimensionCols>>;

  dataStore: Observable<DSourceState<DataType, DimensionRows>>;

  /** Stores to pass dimension data for render */
  dimensionRow: Observable<DimensionSettingsState>;
  dimensionCol: Observable<DimensionSettingsState>;

  /** We use this store to define is rgRow selected */
  rowSelectionStore: Observable<SelectionStoreState>;
  /** Selection connection */
  segmentSelectionStore: Observable<SelectionStoreState>;

  /** Cols dataset */
  viewportCol: Observable<ViewportState>;
  /** Rows dataset */
  viewportRow: Observable<ViewportState>;

  /** Slot to put data */
  slot: SlotType;

  /** Current grid uniq Id */
  uuid: string;

  type: DimensionRows;

  canDrag?: boolean;
  style?: { [key: string]: string };
  onUnregister?(): void;
  onSetRange?(e: CustomEvent<RangeArea>): void;
  onSetTempRange?(e: CustomEvent<TempRange | null>): void;
  onFocusCell?(e: CustomEvent<{ focus: Cell; end: Cell }>): void;
};

export type ViewportProps = {
  prop: Record<string, any>;
  position: Cell;
  type: DimensionCols;
  /** Cols dataset */
  viewportCol: Observable<ViewportState>;

  /** header container props */
  headerProp: HeaderProperties;

  /** parent selector link */
  parent: string;

  /** viewport rows */
  dataPorts: ViewportData[];

  columnSelectionStore: Observable<SelectionStoreState>;
};
