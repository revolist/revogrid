import { getItemByIndex, getItemByPosition } from '../../store/dimension/dimension.helpers';
import { DimensionSettingsState } from '../..';
import { Cell, RangeArea, RangeAreaCss } from '../..';

export type EventData = {
  el: HTMLElement;
  rows: DimensionSettingsState;
  cols: DimensionSettingsState;
  lastCell: Cell;
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
  const rgRow = getItemByPosition(rows, cellY);
  const rgCol = getItemByPosition(cols, cellX);
  // before first
  if (rgCol.itemIndex < 0) {
    rgCol.itemIndex = 0;
  }
  // before first
  if (rgRow.itemIndex < 0) {
    rgRow.itemIndex = 0;
  }
  return { x: rgCol.itemIndex, y: rgRow.itemIndex };
}

export function getCoordinate(range: RangeArea, focus: Cell, changes: Partial<Cell>, isMulti = false) {
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
// export function getDirectionCoordinate(initial: Cell, last: Cell): Partial<Cell> | null {
//   const c: (keyof Cell)[] = ['x', 'y'];
//   for (let k of c) {
//     if (initial[k] !== last[k]) {
//       return { [k]: 1 };
//     }
//   }
//   return null;
// }

// export function getLargestAxis(initial: Cell, last: Cell): Partial<Cell> | null {
//   const cell: Partial<Cell> = {};
//   const c: (keyof Cell)[] = ['x', 'y'];
//   for (let k of c) {
//     cell[k] = Math.abs(initial[k] - last[k]);
//   }
//   if (cell.x > cell.y) {
//     return { x: 1 };
//   }
//   if (cell.y > cell.x) {
//     return { y: 1 };
//   }
//   return null;
// }

function styleByCellProps(styles: { [key: string]: number }): RangeAreaCss {
  return {
    left: `${styles.left}px`,
    top: `${styles.top}px`,
    width: `${styles.width}px`,
    height: `${styles.height}px`,
  };
}

export function getCell({ x, y, x1, y1 }: RangeArea, dimensionRow: DimensionSettingsState, dimensionCol: DimensionSettingsState) {
  const top = getItemByIndex(dimensionRow, y).start;
  const left = getItemByIndex(dimensionCol, x).start;
  const bottom = getItemByIndex(dimensionRow, y1).end;
  const right = getItemByIndex(dimensionCol, x1).end;

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function getElStyle(range: RangeArea, dimensionRow: DimensionSettingsState, dimensionCol: DimensionSettingsState): RangeAreaCss {
  const styles = getCell(range, dimensionRow, dimensionCol);
  return styleByCellProps(styles);
}
