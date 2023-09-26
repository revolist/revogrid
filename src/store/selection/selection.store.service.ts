import { Observable } from '../..';
import { Cell, SelectionStoreState, EditCellStore, RangeArea } from '../..';
import { getRange } from './selection.helpers';
interface Config {
  changeRange(range: RangeArea): boolean;
  focus(focus: Cell, end: Cell): boolean;
}

export default class SelectionStoreService {
  constructor(public store: Observable<SelectionStoreState>, private config: Config) {
    this.store = store;
  }

  get edited(): EditCellStore | null {
    return this.store.get('edit');
  }

  get focused(): Cell | null {
    return this.store.get('focus');
  }

  get ranged(): RangeArea | null {
    return this.store.get('range');
  }

  changeRange(range: RangeArea) {
    return this.config.changeRange(range);
  }

  focus(cell?: Cell, isMulti = false) {
    if (!cell) {
      return false;
    }
    let end: Cell = cell;

    // range edit
    if (isMulti) {
      let start: Cell | null = this.store.get('focus');
      if (start) {
        return this.config.changeRange(getRange(start, end));
      }
    }

    // single focus
    return this.config.focus(cell, end);
  }
}
