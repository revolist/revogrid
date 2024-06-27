import type { JSXBase } from '@stencil/core/internal';
import type {
  DimensionCols,
  ColumnRegular,
  Observable,
  ViewPortScrollEvent,
  ViewportState,
  Cell,
  SelectionStoreState,
  MultiDimensionType,
} from '@type';
import type {
  DimensionStoreCollection,
  DSourceState,
  ViewportStore,
} from '@store';
import type { RowDataSources } from '../services/data.provider';
import type { JSX } from '..';

export type SlotType = 'content' | 'header' | 'footer';

export interface ElementScroll {
  changeScroll?(
    e: ViewPortScrollEvent,
    silent?: boolean,
  ): Promise<ViewPortScrollEvent>;
  setScroll?(e: ViewPortScrollEvent): Promise<void>;
}
export type ElementsScroll = { [key: string]: ElementScroll[] };

export type HeaderProperties = JSX.RevogrHeader;

export type ViewportProperties = JSX.RevogrViewportScroll &
  JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;

type ViewportStoreCollection = {
  [T in MultiDimensionType]: ViewportStore;
};

export type ViewportColumn = {
  colType: DimensionCols;
  position: Cell;

  fixWidth?: boolean;

  viewports: ViewportStoreCollection;
  dimensions: DimensionStoreCollection;

  rowStores: RowDataSources;
  colStore: Observable<DSourceState<ColumnRegular, DimensionCols>>;
} & Partial<JSX.RevogrViewportScroll> &
  Partial<JSX.RevogrHeader>;

export type ViewportData = {
  /** Selection connection */
  segmentSelectionStore: Observable<SelectionStoreState>;

  /** Slot to put data */
  slot: SlotType;

  /** Current grid uniq Id */
  uuid: string;
  style?: { [key: string]: string };
} & JSX.RevogrOverlaySelection &
  JSX.RevogrData;

export type ViewportProps = {
  prop: JSX.RevogrViewportScroll &
    JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;
  position: Cell;
  type: DimensionCols;
  /** Cols dataset */
  viewportCol: Observable<ViewportState>;

  /** header container props */
  headerProp: HeaderProperties;

  /** parent selector link */
  // parent: string;

  /** viewport rows */
  dataPorts: ViewportData[];

  columnSelectionStore: Observable<SelectionStoreState>;
};
