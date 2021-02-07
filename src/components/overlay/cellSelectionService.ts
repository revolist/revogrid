import debounce from 'lodash/debounce';
import each from 'lodash/each';

import { Selection, RevoGrid } from '../../interfaces';
import { getItemByIndex, getItemByPosition } from '../../store/dimension/dimension.helpers';
import { getRange } from '../../store/selection/selection.helpers';
import Cell = Selection.Cell;
import Range = Selection.RangeArea;

interface Config {
  canRange: boolean;
  changeRange(range: Range): boolean;
  focus(cell: Cell, isMulti?: boolean): boolean;
  applyRange(start: Cell, end: Cell): void;
  tempRange(start: Cell, end: Cell): void;
  autoFill(isAutofill: boolean): Cell | null;
}

type EventData = {
  el: HTMLElement;
  rows: RevoGrid.DimensionSettingsState;
  cols: RevoGrid.DimensionSettingsState;
  lastCell: Selection.Cell;
};

export default class CellSelectionService {
  public canRange: boolean = false;
  private autoFillInitial: Cell | null = null;
  private autoFillStart: Cell | null = null;
  private autoFillLast: Cell | null = null;

  readonly onMouseMove = debounce((e: MouseEvent, data: EventData) => this.doMouseMove(e, data), 5);

  constructor(private config: Config) {
    this.canRange = config.canRange;
  }

  keyPositionChange(changes: Partial<Cell>, eData: EventData, range?: Range, focus?: Cell, isMulti = false) {
    if (!range || !focus) {
      return false;
    }
    const data = getCoordinate(range, focus, changes, isMulti);
    if (!data) {
      return false;
    }
    if (isMulti) {
      if (isAfterLast(data.end, eData) || isBeforeFirst(data.start)) {
        return false;
      }
      const range = getRange(data.start, data.end);
      return this.config.changeRange(range);
    }
    return this.config.focus(data.start);
  }

  onCellDown({ shiftKey, x, y, defaultPrevented }: MouseEvent, data: EventData): void {
    if (defaultPrevented) {
      return;
    }
    /** Regular cell click */
    const focusCell: Cell = getCurrentCell({ x, y }, data);
    this.config.focus(focusCell, this.canRange && shiftKey);
  }

  onAutoFillStart(e: MouseEvent, data: EventData): void {
    /** Get cell by autofill element */
    const { top, left } = (e.target as HTMLElement).getBoundingClientRect();
    this.autoFillInitial = this.config.autoFill(true);
    this.autoFillStart = getCurrentCell({ x: left, y: top }, data);
    e.preventDefault();
  }

  clearSelection(): void {
    /** Apply autofill values on mouse up */
    if (this.autoFillInitial) {
      this.autoFillInitial = this.config.autoFill(false);
      this.config.applyRange(this.autoFillInitial, this.autoFillLast);

      this.autoFillInitial = null;
      this.autoFillLast = null;
      this.autoFillStart = null;
    }
  }

  /**
   * Autofill logic:
   * on mouse move apply based on previous direction (if present)
   */
  doMouseMove({ x, y }: MouseEvent, data: EventData): void {
    if (!this.autoFillInitial) {
      return;
    }
    let current = getCurrentCell({ x, y }, data);
    let direction: Partial<Cell> | null;
    if (this.autoFillLast) {
      direction = getDirectionCoordinate(this.autoFillStart, this.autoFillLast);
    }

    // first time or direction equal to start(same as first time)
    if (!this.autoFillLast || !direction) {
      direction = getLargestAxis(this.autoFillStart, current);

      if (!this.autoFillLast) {
        this.autoFillLast = this.autoFillStart;
      }
    }

    // nothing changed
    if (!direction) {
      return;
    }
    each(direction, (v: number, k: keyof Cell) => {
      if (v) {
        current = { ...this.autoFillLast, [k]: current[k] };
      }
    });

    // check if not the latest
    if (isAfterLast(current, data)) {
      return;
    }
    this.autoFillLast = current;
    this.config.tempRange(this.autoFillInitial, this.autoFillLast);
  }
}

/** check if out of range */
function isAfterLast({ x, y }: Cell, { lastCell }: EventData) {
  return x >= lastCell.x || y >= lastCell.y;
}

/** check if out of range */
function isBeforeFirst({ x, y }: Cell) {
  return x < 0 || y < 0;
}

/** Calculate cell based on x, y position */
function getCurrentCell({ x, y }: Cell, { el, rows, cols }: EventData): Cell {
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

/** Compare cells, only 1 coordinate difference is possible */
function getDirectionCoordinate(initial: Cell, last: Cell): Partial<Cell> | null {
  const c: (keyof Cell)[] = ['x', 'y'];
  for (let k of c) {
    if (initial[k] !== last[k]) {
      return { [k]: 1 };
    }
  }
  return null;
}

function getLargestAxis(initial: Cell, last: Cell): Partial<Cell> | null {
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

function getCoordinate(range: Range, focus: Cell, changes: Partial<Cell>, isMulti = false) {
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
