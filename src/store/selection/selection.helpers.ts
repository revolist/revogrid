import { EMPTY_INDEX } from '../../services/selection.store.connector';
import { Cell, RangeArea } from '@type';

export function isHiddenStore(pos: number) {
  return pos === EMPTY_INDEX;
}

export function nextCell(cell: Cell, lastCell: Cell): Partial<Cell> | null {
  const nextItem: Partial<Cell> = {};
  let types: (keyof Cell)[] = ['x', 'y'];

  // previous item check
  for (let t of types) {
    if (cell[t] < 0) {
      nextItem[t] = cell[t];
      return nextItem;
    }
  }
  // next item check
  for (let t of types) {
    if (cell[t] >= lastCell[t]) {
      nextItem[t] = cell[t] - lastCell[t];
      return nextItem;
    }
  }
  return null;
}

export function cropCellToMax(cell: Cell, lastCell: Cell): Cell {
  const croppedCell: Cell = { ...cell };
  const cellCoordinates: (keyof Cell)[] = ['x', 'y'];

  for (const coordinate of cellCoordinates) {
    if (cell[coordinate] < 0) {
      croppedCell[coordinate] = 0;
    } else if (cell[coordinate] >= lastCell[coordinate]) {
      croppedCell[coordinate] = lastCell[coordinate] - 1;
    }
  }

  return croppedCell;
}

export function getRange(start?: Cell | null, end?: Cell | null): RangeArea | null {
  return start && end
    ? {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        x1: Math.max(start.x, end.x),
        y1: Math.max(start.y, end.y),
      }
    : null;
}

export function isRangeSingleCell(a: RangeArea): boolean {
  return a.x === a.x1 && a.y === a.y1;
}
