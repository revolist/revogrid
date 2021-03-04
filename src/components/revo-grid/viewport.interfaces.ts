import { DataSourceState, Groups } from '../../store/dataSource/data.store';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { ViewportStores } from '../../services/viewport.provider';
import { DimensionStores } from '../../services/dimension.provider';
import { RowDataSources } from '../../services/data.provider';

export type SlotType = 'content' | 'header' | 'footer';

export type HeaderProperties = {
  parent: string;
  colData: RevoGrid.ColumnRegular[];
  dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
  groups: Groups;
  groupingDepth: number;
  onHeaderResize?(e: CustomEvent<RevoGrid.ViewSettingSizeProp>): void;
};

export interface ViewportColumn {
  colType: RevoGrid.DimensionCols;
  position: Selection.Cell;

  contentHeight: number;
  uuid: string;
  fixWidth?: boolean;

  viewports: ViewportStores;
  dimensions: DimensionStores;

  rowStores: RowDataSources;
  colStore: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;

  onHeaderResize?(e: CustomEvent<RevoGrid.ViewSettingSizeProp>): void;
  onResizeViewport?(e: CustomEvent<RevoGrid.ViewPortResizeEvent>): void;
}

export type ViewportData = {
  /** Last cell in data viewport. Indicates borders of viewport */
  lastCell: Selection.Cell;

  /** Viewport data position. Position provides connection between independent data stores and Selection store. */
  position: Selection.Cell;
  colData: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;

  dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  /** Stores to pass dimension data for render */
  dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  dimensionCol: Observable<RevoGrid.DimensionSettingsState>;

  /** We use this store to define is row selected */
  rowSelectionStore: Observable<Selection.SelectionStoreState>;
  /** Selection connection */
  segmentSelectionStore: Observable<Selection.SelectionStoreState>;

  /** Cols dataset */
  viewportCol: Observable<RevoGrid.ViewportState>;
  /** Rows dataset */
  viewportRow: Observable<RevoGrid.ViewportState>;

  /** Slot to put data */
  slot: SlotType;

  /** Current grid uniq Id */
  uuid: string;

  type: RevoGrid.DimensionRows;

  canDrag?: boolean;
  style?: { [key: string]: string };
  onUnregister?(): void;
  onSetRange?(e: CustomEvent<Selection.RangeArea>): void;
  onSetTempRange?(e: CustomEvent<Selection.TempRange | null>): void;
  onFocusCell?(e: CustomEvent<{ focus: Selection.Cell; end: Selection.Cell }>): void;
};

export type ViewportProps = {
  prop: Record<string, any>;
  position: Selection.Cell;
  /** Cols dataset */
  viewportCol: Observable<RevoGrid.ViewportState>;

  /** header container props */
  headerProp: Record<string, any>;

  /** parent selector link */
  parent: string;

  /** viewport rows */
  dataPorts: ViewportData[];

  columnSelectionStore: Observable<Selection.SelectionStoreState>;
};
