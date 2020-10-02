import debounce from 'lodash/debounce';
import each from 'lodash/each';

import {Selection, RevoGrid} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';
import Cell = Selection.Cell;

interface Config {
  canRange: boolean;

  focus(cell: Cell, isMulti?: boolean): void;
  applyRange(start: Cell, end: Cell): void;
  tempRange(start: Cell, end: Cell): void;
  autoFill(isAutofill: boolean): Cell|null;
}

type EventData = {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState};

export default class CellSelectionService {
  public canRange: boolean = false;
  private autoFillInitial: Cell|null = null;
  private autoFillStart: Cell|null = null;
  private autoFillLast: Cell|null = null;

  public readonly onMouseMove = debounce((e: MouseEvent, data: EventData) => this.doMouseMove(e, data), 5);

  constructor(private config: Config) {
    this.canRange = config.canRange;
  }

  onCellDown({shiftKey, x, y, defaultPrevented}: MouseEvent, data: EventData): void {
    if (defaultPrevented) {
      return;
    }
    /** Regular cell click */
    const focusCell: Cell = this.getCurrentCell({x, y}, data);
    this.config.focus(focusCell, this.canRange && shiftKey);
  }

  onAutoFillStart(e: MouseEvent, data: EventData): void {
    /** Get cell by autofill element */
    const {top, left} = (e.target as HTMLElement).getBoundingClientRect();
    this.autoFillInitial = this.config.autoFill(true);
    this.autoFillStart = this.getCurrentCell({x: left, y: top}, data);
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

  /** Autofill logic: on mouse move apply based on previous direction (if present) */
  doMouseMove({x, y}: MouseEvent, data: EventData): void {
    if (!this.autoFillInitial) {
      return;
    }
    let current = this.getCurrentCell({x, y}, data);
    let direction: Partial<Cell>|null;
    if (this.autoFillLast) {
      direction = this.getCoordinate(this.autoFillStart, this.autoFillLast);
    }

    // first time or direction equal to start(same as first time)
    if (!this.autoFillLast || !direction) {
      direction = this.getLargestDirection(this.autoFillStart, current);

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

    this.autoFillLast = current;
    this.config.tempRange(this.autoFillInitial, this.autoFillLast);
  }

  getLargestDirection(initial: Cell, last: Cell): Partial<Cell>|null {
    const cell: Partial<Cell> = {};
    const c: (keyof Cell)[] = ['x', 'y'];
    for (let k of c) {
      cell[k] = Math.abs(initial[k] - last[k]);
    }
    if (cell.x > cell.y) {
      return { x: 1 };
    } else if (cell.y > cell.x) {
      return { y: 1 };
    }
    return null;
  }

  /** Calculate cell based on x, y position */
  private getCurrentCell({x, y}: Cell, {el, rows, cols}: EventData): Cell {
    const {top, left, height, width} = el.getBoundingClientRect();
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
    return { x: col.itemIndex, y: row.itemIndex };
  }

  /** Compare cells, only 1 coordinate difference is possible */
  private getCoordinate(initial: Cell, last: Cell): Partial<Cell>|null {
    const c: (keyof Cell)[] = ['x', 'y'];
    for (let k of c) {
      if (initial[k] !== last[k]) {
        return {[k]: 1};
      }
    }
    return null;
  }
}
