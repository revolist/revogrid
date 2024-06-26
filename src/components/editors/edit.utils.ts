import { EDIT_INPUT_WR } from '../../utils/consts';
import {
  EditorCtrConstructible,
} from '@type';
// is edit input
export function isEditInput(el?: HTMLElement) {
  return !!el?.closest(`.${EDIT_INPUT_WR}`);
}


// Type guard for EditorCtrConstructible
export function isEditorCtrConstructible(
  editor: any,
): editor is EditorCtrConstructible {
  return typeof editor === 'function' && typeof editor.prototype === 'object';
}
