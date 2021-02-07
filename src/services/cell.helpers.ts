import { DATA_COL, DATA_ROW } from '../utils/consts';
import { Selection } from '../interfaces';

export function getCell(cell: HTMLElement): Selection.Cell {
  return {
    x: parseInt(cell.getAttribute(DATA_COL), 10),
    y: parseInt(cell.getAttribute(DATA_ROW), 10),
  };
}
