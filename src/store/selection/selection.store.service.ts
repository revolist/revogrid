import {ObservableMap} from '@stencil/store';
import {Edition, Selection} from '../../interfaces';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;
import Range = Selection.RangeArea;


interface Config {
  changeRange(range: Range): void;
  unregister(): void;
  focus(focus: Cell, end: Cell): void;
}

export default class SelectionStoreService {
  constructor(public store: ObservableMap<Selection.SelectionStoreState>, private config: Config) {
    this.store = store;
  }

  get edited(): Edition.EditCellStore|null {
    return this.store.get('edit');
  }

  get focused(): Cell|null {
    return this.store.get('focus');
  }

  get ranged(): Range|null {
    return this.store.get('range');
  }

  changeRange(range: Range) {
    this.config.changeRange(range);
  }

  focus(cell?: Cell, isMulti = false) {
    if (!cell) {
      return;
    }
    let end: Cell = cell;

    // range edit
    if (isMulti) {
      let start: Cell|null = this.store.get('focus');
      if (start) {
        this.config.changeRange(getRange(start, end));
        return;
      }
    }

    // single focus
    this.config.focus(cell, end);
  }
  
  destroy(): void {
    this.config.unregister();
  }
}
