import { ColumnRegular, Observable, ViewPortScrollEvent, ViewportState } from './interfaces';
import { DSourceState, JSX } from '..';
import { DimensionCols } from './dimension';
import { Cell, SelectionStoreState } from './selection';
import { RowDataSources } from '../services/data.provider';
import { DimensionStoreCollection } from '../store/dimension/dimension.store';
import { ViewportStoreCollection } from '../store/viewport/viewport.store';
import { JSXBase } from '@stencil/core/internal';

export type SlotType = 'content' | 'header' | 'footer';


export interface ElementScroll {
  changeScroll?(e: ViewPortScrollEvent, silent?: boolean): Promise<ViewPortScrollEvent>;
  setScroll?(e: ViewPortScrollEvent): Promise<void>;
}
export type ElementsScroll = { [key: string]: ElementScroll[] };


export type HeaderProperties = JSX.RevogrHeader;

export type ViewportProperties = JSX.RevogrViewportScroll & JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;

export type ViewportColumn = {
  colType: DimensionCols;
  position: Cell;

  fixWidth?: boolean;

  viewports: ViewportStoreCollection;
  dimensions: DimensionStoreCollection;

  rowStores: RowDataSources;
  colStore: Observable<DSourceState<ColumnRegular, DimensionCols>>;
} & Partial<JSX.RevogrViewportScroll> & Partial<JSX.RevogrHeader>;

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
  prop: JSX.RevogrViewportScroll & JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;
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