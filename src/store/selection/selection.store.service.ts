import {ObservableMap} from '@stencil/store';
import {Edition, Selection} from '../../interfaces';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;
import EditCell = Edition.EditCell;


interface Config {
  change(changes: Partial<Cell>, isMulti?: boolean): void;
  changeRange(range: Selection.RangeArea): void;
  unregister(): void;
  focus(focus: Cell, end: Cell): void;
}

export default class SelectionStoreService {
  constructor(public store: ObservableMap<Selection.SelectionStoreState>, private config: Config) {
    this.store = store;
  }

  get edited(): EditCell|null {
    return this.store.get('edit');
  }

  get focused(): Cell|null {
    return this.store.get('focus');
  }

  get ranged(): Selection.RangeArea|null {
    return this.store.get('range');
  }

  change(area: Partial<Cell>, isMulti: boolean = false): void {
    this.config.change(area, isMulti);
  }

  focus(cell?: Cell, isMulti: boolean = false): void {
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
