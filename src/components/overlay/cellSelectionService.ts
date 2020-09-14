import debounce from 'lodash/debounce';
import each from 'lodash/each';

import {codesLetter} from '../../utils/keyCodes';
import {Selection, RevoGrid} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';
import {CELL_HANDLER_CLASS} from '../../utils/consts';
import Cell = Selection.Cell;

interface Config {
  canRange: boolean;

  focus(cell: Cell, isMulti?: boolean): void;
  applyRange(start: Cell, end: Cell): void;
  tempRange(start: Cell, end: Cell): void;
  autoFill(isAutofill: boolean): Cell|null;
  change(area: Partial<Cell>, isMulti?: boolean): void;
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

  onMouseDown({target}: MouseEvent, data: EventData): void {
    const autoFill = this.isAutoFillHandler({target: target as HTMLElement});
    if (autoFill) {
      /** Get cell by autofill element */
      const {top, left} = (target as HTMLElement).getBoundingClientRect();
      this.autoFillInitial = this.config.autoFill(true);
      this.autoFillStart = this.getCurrentCell({x: left, y: top}, data);
    }
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

  doSelection({x, y, shiftKey}: MouseEvent, data: EventData): void {
    if (this.autoFillInitial) {
      return;
    }
    /** Regular cell click */
    const focusCell: Cell = this.getCurrentCell({x, y}, data);
    this.config.focus(focusCell, this.canRange && shiftKey);
  }

  /** Autofill logic: on mouse move apply based on previous direction (if present) */
  doMouseMove({x, y}: MouseEvent, data: EventData): void {
    if (this.autoFillInitial) {
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

  keyDown(e: KeyboardEvent): void {
    const isMulti: boolean = this.canRange && e.shiftKey;
    switch (e.code) {
      case codesLetter.ARROW_UP:
      case codesLetter.ARROW_DOWN:
      case codesLetter.ARROW_LEFT:
      case codesLetter.ARROW_RIGHT:
        e.preventDefault();
        break;
    }
    switch (e.code) {
      case codesLetter.ARROW_UP:
        this.config.change({ y: -1 }, isMulti);
        break;
      case codesLetter.ARROW_DOWN:
        this.config.change({ y: 1 }, isMulti);
        break;
      case codesLetter.ARROW_LEFT:
        this.config.change({ x: -1 }, isMulti);
        break;
      case codesLetter.ARROW_RIGHT:
        this.config.change({ x: 1 }, isMulti);
        break;
    }
  }

  /** Calculate cell based on x, y position */
  private getCurrentCell({x, y}: Cell, {el, rows, cols}: EventData): Cell {
    const {top, left} = el.getBoundingClientRect();
    const row = getItemByPosition(rows, y - top);
    const col = getItemByPosition(cols, x - left);
    return { x: col.itemIndex, y: row.itemIndex };
  }

  /** Test if handler class present */
  private isAutoFillHandler({target}: {target?: HTMLElement}): boolean {
    return target?.classList.contains(CELL_HANDLER_CLASS);
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
