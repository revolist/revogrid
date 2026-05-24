import { getRange } from '@store';
import {
  codesLetter,
  isAll,
  isClear,
  isCopy,
  isCut,
  isEnterKeyValue,
  isPaste,
  isShortcutModifier,
  isTab,
  timeout,
  RESIZE_INTERVAL,
  type Observable,
} from '../../utils';
import {
  EventData,
  getCoordinate,
  isAfterLast,
  isBeforeFirst,
} from './selection.utils';
import { Cell, Nullable, RangeArea, SelectionStoreState } from '@type';
import { isEditInput } from '../editors/edit.utils';

type Config = {
  selectionStore: Observable<SelectionStoreState>;

  // Apply changes from edit.
  change(val?: any): void;
  // Cancels edit. Escape changes.
  cancel(): void;

  clearCell(): void;
  focus(
    focus: Cell,
    changes: Partial<Cell>,
    focusNextViewport?: number,
  ): boolean;

  getData(): any;
  internalPaste(): void;
  range(range: RangeArea | null): boolean;
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

  /**
   * Appends printable key input that arrives after edit mode was requested
   * but before the editor input has mounted or received focus.
   */
  private appendPendingEditValue(e: KeyboardEvent): boolean {
    if (
      isShortcutModifier(e) ||
      e.key.length !== 1 ||
      (e.target instanceof HTMLElement && isEditInput(e.target))
    ) {
      return false;
    }

    const editCell = this.sv.selectionStore.get('edit');
    if (typeof editCell?.val !== 'string') {
      return false;
    }

    this.sv.selectionStore.set('edit', {
      ...editCell,
      val: `${editCell.val}${e.key}`,
    });
    return true;
  }

  async keyDown(
    e: KeyboardEvent,
    canRange: boolean,
    isEditMode: boolean,
    { range, focus }: Nullable<Pick<EventData, 'range' | 'focus'>>,
  ) {
    // IF EDIT MODE
    if (isEditMode) {
      if (this.appendPendingEditValue(e)) {
        return;
      }

      switch (e.code) {
        case codesLetter.ESCAPE:
          this.sv.cancel();
          break;
        case codesLetter.TAB:
          this.keyChangeSelection(e, canRange);
          break;
      }
      return;
    }

    // IF NOT EDIT MODE

    // pressed clear key
    if (range && isClear(e.code)) {
      this.sv.clearCell();
      return;
    }

    // below works with focus only
    if (!focus) {
      return;
    }

    // tab key means same as arrow right
    if (isTab(e.code)) {
      this.keyChangeSelection(e, canRange);
      return;
    }

    // pressed enter
    if (isEnterKeyValue(e.key)) {
      this.sv.change();
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
    if (!isShortcutModifier(e) && e.key.length === 1) {
      this.sv.change(e.key);
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
    range: RangeArea | null,
    focus: Cell | null,
    isMulti = false,
  ) {
    if (!range || !focus) {
      return false;
    }
    const data = getCoordinate(range, focus, changes, isMulti);
    if (!data) {
      return false;
    }
    const eData: EventData = this.sv.getData();
    if (isMulti) {
      if (isAfterLast(data.end, eData.lastCell) || isBeforeFirst(data.start)) {
        return false;
      }
      const range = getRange(data.start, data.end);
      return this.sv.range(range);
    }
    return this.sv.focus(
      data.start,
      changes,
      isAfterLast(data.start, eData.lastCell)
        ? 1
        : isBeforeFirst(data.start)
          ? -1
          : 0,
    );
  }

  /** Monitor key direction changes */
  changeDirectionKey(
    e: KeyboardEvent,
    canRange: boolean,
  ): { changes: Partial<Cell>; isMulti?: boolean } | void {
    const isMulti = canRange && e.shiftKey;
    if (DIRECTION_CODES.includes(e.code)) {
      e.preventDefault();
    }

    if (e.shiftKey) {
      switch (e.code) {
        case codesLetter.TAB:
          return { changes: { x: -1 }, isMulti: false };
      }
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
