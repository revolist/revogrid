import { getItemByIndex, getItemByPosition } from '../../store/dimension/dimension.helpers';
import { Selection, RevoGrid } from '../../interfaces';
import Cell = Selection.Cell;

export type EventData = {
  el: HTMLElement;
  rows: RevoGrid.DimensionSettingsState;
  cols: RevoGrid.DimensionSettingsState;
  lastCell: Selection.Cell;
};

/** Calculate cell based on x, y position */
export function getCurrentCell({ x, y }: Cell, { el, rows, cols }: EventData): Cell {
  const { top, left, height, width } = el.getBoundingClientRect();
  let cellY = y - top;

  // limit to element height

  if (cellY >= height) {
    cellY = height - 1;
  }
  let cellX = x - left;
  // limit to element width
  if (cellX >= width) {
    cellX = width - 1;
  }
  const row = getItemByPosition(rows, cellY);
  const col = getItemByPosition(cols, cellX);
  // before first
  if (col.itemIndex < 0) {
    col.itemIndex = 0;
  }
  // before first
  if (row.itemIndex < 0) {
    row.itemIndex = 0;
  }
  return { x: col.itemIndex, y: row.itemIndex };
}

export function getCoordinate(range: Selection.RangeArea, focus: Cell, changes: Partial<Cell>, isMulti = false) {
  const updateCoordinate = (c: keyof Cell) => {
    const start = { x: range.x, y: range.y };
    const end = isMulti ? { x: range.x1, y: range.y1 } : start;
    const point = end[c] > focus[c] ? end : start;
    point[c] += changes[c];
    return { start, end };
  };

  if (changes.x) {
    return updateCoordinate('x');
  }
  if (changes.y) {
    return updateCoordinate('y');
  }
  return null;
}

/** check if out of range */
export function isAfterLast({ x, y }: Cell, { lastCell }: EventData) {
  return x >= lastCell.x || y >= lastCell.y;
}

/** check if out of range */
export function isBeforeFirst({ x, y }: Cell) {
  return x < 0 || y < 0;
}

/** Compare cells, only 1 coordinate difference is possible */
export function getDirectionCoordinate(initial: Cell, last: Cell): Partial<Cell> | null {
  const c: (keyof Cell)[] = ['x', 'y'];
  for (let k of c) {
    if (initial[k] !== last[k]) {
      return { [k]: 1 };
    }
  }
  return null;
}

export function getLargestAxis(initial: Cell, last: Cell): Partial<Cell> | null {
  const cell: Partial<Cell> = {};
  const c: (keyof Cell)[] = ['x', 'y'];
  for (let k of c) {
    cell[k] = Math.abs(initial[k] - last[k]);
  }
  if (cell.x > cell.y) {
    return { x: 1 };
  }
  if (cell.y > cell.x) {
    return { y: 1 };
  }
  return null;
}

function styleByCellProps(styles: { [key: string]: number }): Selection.RangeAreaCss {
  return {
    left: `${styles.left}px`,
    top: `${styles.top}px`,
    width: `${styles.width}px`,
    height: `${styles.height}px`,
  };
}

export function getCell({ x, y, x1, y1 }: Selection.RangeArea, dimensionRow: RevoGrid.DimensionSettingsState, dimensionCol: RevoGrid.DimensionSettingsState) {
  const top: number = getItemByIndex(dimensionRow, y).start;
  const left: number = getItemByIndex(dimensionCol, x).start;
  const bottom: number = getItemByIndex(dimensionRow, y1).end;
  const right: number = getItemByIndex(dimensionCol, x1).end;

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function getElStyle(range: Selection.RangeArea, dimensionRow: RevoGrid.DimensionSettingsState, dimensionCol: RevoGrid.DimensionSettingsState): Selection.RangeAreaCss {
  const styles = getCell(range, dimensionRow, dimensionCol);
  return styleByCellProps(styles);
}
