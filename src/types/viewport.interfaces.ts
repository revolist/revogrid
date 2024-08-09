import type { JSXBase } from '@stencil/core/internal';
import type {
  DimensionCols,
  ColumnRegular,
  ViewPortScrollEvent,
  ViewportState,
  Cell,
  SelectionStoreState,
} from '@type';
import type {
  DimensionStoreCollection,
  ViewportStoreCollection,
  DSourceState,
} from '@store';
import { Observable } from '../utils/store.utils';
import type { RowDataSources } from '../services/data.provider';
import type { JSX } from '..';

export type SlotType = 'content' | 'header' | 'footer';

export interface ElementScroll {
  changeScroll?(
    e: ViewPortScrollEvent,
    silent?: boolean,
  ): Promise<ViewPortScrollEvent | undefined>;
  setScroll?(e: ViewPortScrollEvent): Promise<void>;
}
export type ElementsScroll = { [key: string]: ElementScroll[] };

export type HeaderProperties = JSX.RevogrHeader;

export type ViewportProperties = JSX.RevogrViewportScroll &
  JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;

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
  style?: { [key: string]: string };
} & JSX.RevogrOverlaySelection &
  (Pick<JSXBase.HTMLAttributes<HTMLRevogrOverlaySelectionElement>, 'ref'> &
    Pick<JSXBase.HTMLAttributes<HTMLRevogrDataElement>, 'ref'>) &
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
