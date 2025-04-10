import type { Cell } from '@type';
import { DATA_COL, DATA_ROW } from '../utils/consts';

export function getCell(cell: HTMLElement): Cell {
  return {
    x: parseInt(cell.getAttribute(DATA_COL) ?? '0', 10),
    y: parseInt(cell.getAttribute(DATA_ROW) ?? '0', 10),
  };
}
