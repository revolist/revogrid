import { codesLetter } from '../../utils/keyCodes';
import { Selection } from '../../interfaces';
import { isCtrlKey } from '../../utils/keyCodes.utils';

export default class KeyService {
  private ctrlDown = false;

  keyDown(e: KeyboardEvent): void {
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = true;
    }
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
