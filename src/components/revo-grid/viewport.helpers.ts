/** Collect data for pinned columns in required @ViewportProps format */
import { RevoGrid, Selection } from '../../interfaces';
import { ViewportColumn } from './viewport.interfaces';

export const HEADER_SLOT = 'header';
export const FOOTER_SLOT = 'footer';
export const CONTENT_SLOT = 'content';
export const DATA_SLOT = 'data';

/** Receive last visible in viewport by required type */
export function getLastCell(data: ViewportColumn, rowType: RevoGrid.MultiDimensionType): Selection.Cell {
  return {
    x: data.viewports[data.colType].store.get('realCount'),
    y: data.viewports[rowType].store.get('realCount'),
  };
}
