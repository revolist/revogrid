import { EDIT_INPUT_WR } from '../../../utils/consts';

// is edit input
export function isEditInput(el?: HTMLElement) {
  return !!el?.closest(`.${EDIT_INPUT_WR}`);
}
