import { Edition, Observable, Selection } from '../../interfaces';
import { getRange } from './selection.helpers';
import Cell = Selection.Cell;
import Range = Selection.RangeArea;

interface Config {
  changeRange(range: Range): boolean;
  focus(focus: Cell, end: Cell): boolean;
}

export default class SelectionStoreService {
  constructor(public store: Observable<Selection.SelectionStoreState>, private config: Config) {
    this.store = store;
  }

  get edited(): Edition.EditCellStore | null {
    return this.store.get('edit');
  }

  get focused(): Cell | null {
    return this.store.get('focus');
  }

  get ranged(): Range | null {
    return this.store.get('range');
  }

  changeRange(range: Range) {
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
