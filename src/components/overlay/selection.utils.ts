import {
  DimensionIndexInput,
  DSourceState,
  getItemByIndex,
  getItemByPosition,
  getSourceItem,
} from '@store';
import type {
  DimensionSettingsState,
  Cell,
  RangeArea,
  RangeAreaCss,
  DataLookup,
  DimensionRows,
  DataType,
  EditCellStore,
} from '@type';
import { getPropertyFromEvent } from '../../utils/events';
import { Observable } from '../../utils/store.utils';

export type EventData = {
  el: HTMLElement;
  rows: DimensionSettingsState;
  cols: DimensionSettingsState;
  lastCell: Cell;
  focus: Cell | null;
  range: RangeArea | null;
  edit: EditCellStore | null;
};

export function collectModelsOfRange(
  data: DataLookup,
  store: Observable<DSourceState<DataType, DimensionRows>>,
) {
  const models: Partial<DataLookup> = {};
  for (let i in data) {
    const rowIndex = parseInt(i, 10);
    models[rowIndex] = getSourceItem(store, rowIndex);
  }

  return models;
}

export function getFocusCellBasedOnEvent(
  e: MouseEvent | TouchEvent,
  data: EventData,
): Cell | null {
  // If event default is prevented, return
  if (e.defaultPrevented) {
    return null;
  }

  // Get coordinates from event object
  const x = getPropertyFromEvent(e, 'clientX');
  const y = getPropertyFromEvent(e, 'clientY');

  // If coordinates are not available, return
  if (x === null || y === null) {
    return null;
  }

  // Get current cell based on coordinates and data
  const focusCell = getCurrentCell({ x, y }, data);
  // If current cell is not available, return
  if (isAfterLast(focusCell, data.lastCell)) {
    return null;
  }

  return focusCell;
}

/**
 * Calculate cell based on x, y position
 */
export function getCurrentCell(
  { x, y }: Cell,
  { el, rows, cols }: Pick<EventData, 'el' | 'rows' | 'cols'>,
): Cell {
  // Get the bounding rectangle of the element
  const { top, left, height, width } = el.getBoundingClientRect();

  // Calculate the cell position relative to the element
  let cellY = y - top;
  let cellX = x - left;

  // Limit the cell position to the element height
  if (cellY >= height) {
    cellY = height - 1;
  }

  // Limit the cell position to the element width
  if (cellX >= width) {
    cellX = width - 1;
  }

  // Get the row and column items based on the cell position
  const rgRow = getItemByPosition(rows, cellY);
  const rgCol = getItemByPosition(cols, cellX);

  // Set the row and column index to 0 if they are before the first item
  if (rgCol.itemIndex < 0) {
    rgCol.itemIndex = 0;
  }

  if (rgRow.itemIndex < 0) {
    rgRow.itemIndex = 0;
  }

  return { x: rgCol.itemIndex, y: rgRow.itemIndex };
}

export function getCoordinate(
  range: RangeArea,
  focus: Cell,
  changes: Partial<Cell>,
  isMulti = false,
) {
  const updateCoordinate = (c: keyof Cell, pos = 0) => {
    const start = { x: range.x, y: range.y };
    const end = isMulti ? { x: range.x1, y: range.y1 } : start;
    const point = end[c] > focus[c] ? end : start;
    point[c] += pos;
    return { start, end };
  };

  if (changes.x) {
    return updateCoordinate('x', changes['x']);
  }
  if (changes.y) {
    return updateCoordinate('y', changes['y']);
  }
  return null;
}

/**
 * Check if the x coordinate of the cell position is after or equal to the x coordinate of the last cell position
 * or if the y coordinate of the cell position is after or equal to the y coordinate of the last cell position
 */
export function isAfterLast({ x, y }: Cell, lastCell: Cell) {
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

export function styleByCellProps(styles: { [key: string]: number }): RangeAreaCss {
  return {
    left: `${styles.left}px`,
    top: `${styles.top}px`,
    width: `${styles.width}px`,
    height: `${styles.height}px`,
  };
}

export function getCell(
  { x, y, x1, y1 }: RangeArea,
  dimensionRow: Pick<
    DimensionIndexInput,
    'indexToItem' | 'indexes' | 'originItemSize'
  >,
  dimensionCol: Pick<
    DimensionIndexInput,
    'indexToItem' | 'indexes' | 'originItemSize'
  >,
) {
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
