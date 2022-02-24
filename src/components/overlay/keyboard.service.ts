import { Observable, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/keyCodes';
import { isClear, isCtrlKey, isEnterKey, isLetterKey } from '../../utils/keyCodes.utils';
import { timeout } from '../../utils';
import { EventData, getCoordinate, isAfterLast, isBeforeFirst } from './selection.utils';

type Config = {
  selectionStoreService: SelectionStoreService;
  selectionStore: Observable<Selection.SelectionStoreState>;
  range(range: Selection.RangeArea): boolean;
  focusNext(focus: Selection.Cell, next: Partial<Selection.Cell>): boolean;
  applyEdit(val?: any, isEscape?: boolean): void;
  clearCell(): void;
  getData(): any;
  internalPaste(): void;
};

const DIRECTION_CODES: string[] = [
  codesLetter.TAB,
  codesLetter.ARROW_UP,
  codesLetter.ARROW_DOWN,
  codesLetter.ARROW_LEFT,
  codesLetter.ARROW_RIGHT,
];
export class KeyboardService {
  private ctrlDown = false;

  constructor(private sv: Config) {}

  async keyDown(e: KeyboardEvent, canRange: boolean) {
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = true;
    }


    /**
     *  IF EDIT MODE
     */
    if (this.sv.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.sv.applyEdit(undefined, true);
          break;
      }
      return;
    }

    /**
     *  IF NOT EDIT MODE
     */

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
    if (this.isCopy(e)) {
      return;
    }

    // paste operation
    if (this.isPaste(e)) {
      this.sv.internalPaste();
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

  async keyChangeSelection(e: KeyboardEvent, canRange: boolean) {
    const data = this.changeDirectionKey(e, canRange);
    if (!data) {
      return false;
    }
    await timeout();

    const range = this.sv.selectionStore.get('range');
    const focus = this.sv.selectionStore.get('focus');
    return this.keyPositionChange(data.changes, range, focus, data.isMulti);
  }

  keyPositionChange(
    changes: Partial<Selection.Cell>,
    range?: Selection.RangeArea,
    focus?: Selection.Cell,
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

  keyUp(e: KeyboardEvent): void {
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = false;
    }
  }

  isCopy(e: KeyboardEvent): boolean {
    return this.ctrlDown && e.code == codesLetter.C;
  }
  isPaste(e: KeyboardEvent): boolean {
    return this.ctrlDown && e.code == codesLetter.V;
  }

  /** Monitor key direction changes */
  changeDirectionKey(e: KeyboardEvent, canRange: boolean): { changes: Partial<Selection.Cell>; isMulti?: boolean } | void {
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
