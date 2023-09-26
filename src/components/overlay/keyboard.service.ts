import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/key.codes';
import { isAll, isClear, isCopy, isCut, isEnterKey, isLetterKey, isPaste } from '../../utils/key.utils';
import { timeout } from '../../utils';
import { EventData, getCoordinate, isAfterLast, isBeforeFirst } from './selection.utils';
import { RESIZE_INTERVAL } from '../../utils/consts';
import { Cell, RangeArea, SelectionStoreState } from '../..';
import { Observable } from '../..';

type Config = {
  selectionStoreService: SelectionStoreService;
  selectionStore: Observable<SelectionStoreState>;

  applyEdit(val?: any): void;
  cancelEdit(): void;
  clearCell(): void;
  focusNext(focus: Cell, next: Partial<Cell>): boolean;
  getData(): any;
  internalPaste(): void;
  range(range: RangeArea): boolean;
  selectAll(): void;
};

const DIRECTION_CODES: string[] = [
  codesLetter.TAB,
  codesLetter.ARROW_UP,
  codesLetter.ARROW_DOWN,
  codesLetter.ARROW_LEFT,
  codesLetter.ARROW_RIGHT,
];
export class KeyboardService {

  constructor(private sv: Config) {}

  async keyDown(e: KeyboardEvent, canRange: boolean) {
    // IF EDIT MODE
    if (this.sv.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.sv.cancelEdit();
          break;
      }
      return;
    }

    // IF NOT EDIT MODE

    // pressed clear key
    if (this.sv.selectionStoreService.ranged && isClear(e.code)) {
      this.sv.clearCell();
      return;
    }

    // below works with focus only
    if (!this.sv.selectionStoreService.focused) {
      return;
    }

    // tab key means same as arrow right
    if (codesLetter.TAB === e.code) {
      this.keyChangeSelection(e, canRange);
      return;
    }

    // pressed enter
    if (isEnterKey(e.code)) {
      this.sv.applyEdit();
      return;
    }

    // copy operation
    if (isCopy(e)) {
      return;
    }

    // cut operation
    if (isCut(e)) {
      return;
    }

    // paste operation
    if (isPaste(e)) {
      this.sv.internalPaste();
      return;
    }

    // select all
    if (isAll(e)) {
      if (canRange) {
        this.selectAll(e);
      }
      return;
    }

    // pressed letter key
    if (isLetterKey(e.keyCode)) {
      this.sv.applyEdit(e.key);
      return;
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e, canRange)) {
      return;
    }
  }

  private selectAll(e: KeyboardEvent) {
    const range = this.sv.selectionStore.get('range');
    const focus = this.sv.selectionStore.get('focus');
    // if no range or focus - do nothing
    if (!range || !focus) {
      return;
    }
    e.preventDefault();
    this.sv.selectAll();
  }

  async keyChangeSelection(e: KeyboardEvent, canRange: boolean) {
    const data = this.changeDirectionKey(e, canRange);
    if (!data) {
      return false;
    }

    // this interval needed for several cases
    // grid could be resized before next click
    // at this case to avoid screen jump we use this interval
    await timeout(RESIZE_INTERVAL + 30);

    const range = this.sv.selectionStore.get('range');
    const focus = this.sv.selectionStore.get('focus');
    return this.keyPositionChange(data.changes, range, focus, data.isMulti);
  }

  keyPositionChange(
    changes: Partial<Cell>,
    range?: RangeArea,
    focus?: Cell,
    isMulti = false
  ) {
    if (!range || !focus) {
      return false;
    }
    const data = getCoordinate(range, focus, changes, isMulti);
    if (!data) {
      return false;
    }
    if (isMulti) {
      const eData: EventData = this.sv.getData();
      if (isAfterLast(data.end, eData) || isBeforeFirst(data.start)) {
        return false;
      }
      const range = getRange(data.start, data.end);
      return this.sv.range(range);
    }
    return this.sv.focusNext(data.start, changes);
  }

  /** Monitor key direction changes */
  changeDirectionKey(e: KeyboardEvent, canRange: boolean): { changes: Partial<Cell>; isMulti?: boolean } | void {
    const isMulti = canRange && e.shiftKey;
    if (DIRECTION_CODES.includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case codesLetter.ARROW_UP:
        return { changes: { y: -1 }, isMulti };
      case codesLetter.ARROW_DOWN:
        return { changes: { y: 1 }, isMulti };
      case codesLetter.ARROW_LEFT:
        return { changes: { x: -1 }, isMulti };
      case codesLetter.TAB:
      case codesLetter.ARROW_RIGHT:
        return { changes: { x: 1 }, isMulti };
    }
  }
}
