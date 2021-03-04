import { EventEmitter } from '@stencil/core';
import { Observable, Selection, Edition } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/keyCodes';
import { isClear, isCtrlKey, isEnterKey, isLetterKey } from '../../utils/keyCodes.utils';
import { timeout } from '../../utils/utils';
import ColumnService from '../data/columnService';
import { EventData, getCoordinate, isAfterLast, isBeforeFirst } from './selection.utils';

export abstract class KeyboardService {
  protected abstract selectionStoreService: SelectionStoreService;
  protected abstract columnService: ColumnService;
  abstract selectionStore: Observable<Selection.SelectionStoreState>;
  abstract range: boolean;
  abstract internalPaste: EventEmitter;

  protected abstract doEdit(val?: any, isCancel?: boolean): void;
  protected abstract clearCell(): void;
  protected abstract canEdit(): boolean;
  protected abstract onCellEdit(e: Edition.SaveDataDetails, clear?: boolean): void;
  protected abstract getData(): any;

  private ctrlDown = false;

  async keyDown(e: KeyboardEvent) {
    if (!this.selectionStoreService.focused) {
      return;
    }
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = true;
    }

    // tab key means same as arrow right
    if (codesLetter.TAB === e.code) {
      this.keyChangeSelection(e);
      return;
    }

    /**
     *  IF EDIT MODE
     */
    if (this.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.doEdit(undefined, true);
          break;
      }
      return;
    }

    /**
     *  IF NOT EDIT MODE
     */

    // pressed clear key
    if (isClear(e.code)) {
      this.clearCell();
      return;
    }

    // pressed enter
    if (isEnterKey(e.code)) {
      this.doEdit();
      return;
    }

    // copy operation
    if (this.isCopy(e)) {
      return;
    }

    // paste operation
    if (this.isPaste(e)) {
      this.internalPaste.emit();
      return;
    }

    // pressed letter key
    if (isLetterKey(e.keyCode)) {
      this.doEdit(e.key);
      return;
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e)) {
      return;
    }
  }

  protected async keyChangeSelection(e: KeyboardEvent) {
    const data = this.changeDirectionKey(e, this.range);
    if (!data) {
      return false;
    }
    await timeout();

    const range = this.selectionStore.get('range');
    const focus = this.selectionStore.get('focus');
    return this.keyPositionChange(data.changes, this.getData(), range, focus, data.isMulti);
  }

  keyPositionChange(changes: Partial<Selection.Cell>, eData: EventData, range?: Selection.RangeArea, focus?: Selection.Cell, isMulti = false) {
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
      return this.selectionStoreService.changeRange(range);
    }
    return this.selectionStoreService.focus(data.start);
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
    const isMulti: boolean = canRange && e.shiftKey;
    switch (e.code) {
      case codesLetter.TAB:
      case codesLetter.ARROW_UP:
      case codesLetter.ARROW_DOWN:
      case codesLetter.ARROW_LEFT:
      case codesLetter.ARROW_RIGHT:
        e.preventDefault();
        break;
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
