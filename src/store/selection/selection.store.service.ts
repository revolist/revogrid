import {ObservableMap} from '@stencil/store';
import {Edition, Selection} from '../../interfaces';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;


interface Config {
  changeRange(range: Selection.RangeArea): void;
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

  get ranged(): Selection.RangeArea|null {
    return this.store.get('range');
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
  
  positionChange(changes: Partial<Cell>, isMulti?: boolean) {
    const data = getCoordinate(this.store, changes, isMulti);
    if (!data) {
      return;
    }
    if (isMulti) {
      this.config.changeRange(getRange(data.start, data.end));
    } else {
      this.config.focus(data.start, data.start);
    }
  }

  destroy(): void {
    this.config.unregister();
  }
}

function getCoordinate(store: ObservableMap<Selection.SelectionStoreState>, changes: Partial<Cell>, isMulti?: boolean) {
  const range = store.get('range');
  const focus = store.get('focus');
  if (!range || !focus) {
    return null;
  }
  const start: Cell = { x: range.x, y: range.y };
  const end: Cell = isMulti ? { x: range.x1, y: range.y1 } : start;
  const updateCoordinate = (c: keyof Cell) => {
    const point: Cell = end[c] > focus[c]  ? end : start;
    point[c] += changes[c];
  };
  if (changes.x) {
    updateCoordinate('x');
  }
  if (changes.y) {
    updateCoordinate('y');
  }
  return {start, end};
}
