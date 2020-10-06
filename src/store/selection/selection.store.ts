import {ObservableMap} from '@stencil/store';
import {setStore} from '../../utils/store.utils';
import {Edition, Selection} from '../../interfaces';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;
import EditCell = Edition.EditCell;


interface Config {
  lastCell: Cell;
  change(changes: Partial<Cell>, isMulti?: boolean): void;
  unregister(): void;
  focus(focus: Cell, end: Cell): void;
}

export default class SelectionStore {
  constructor(public store: ObservableMap<Selection.SelectionStoreState>, private config: Config) {
    this.store = store;
    this.setLastCell(config.lastCell);
  }

  get edited(): EditCell|null {
    return this.store.get('edit');
  }

  setLastCell(lastCell: Cell): void {
    // todo: for existing need to update
    setStore(this.store, { lastCell });
  }

  /** Can be applied from selection change or from simple keyboard change clicks */
  applyRange(range: Selection.RangeArea): void {
    setStore(this.store, { range, edit: null, tempRange: null });
  }

  setTempRange(start: Cell, end: Cell): void {
    setStore(this.store, { tempRange: getRange(start, end) });
    setStore(this.store, { edit: null });
  }

  clearTemp(): void {
    setStore(this.store, { tempRange: null });
  }

  change(area: Partial<Cell>, isMulti: boolean = false): void {
    this.config.change(area, isMulti);
  }

  focus(cell?: Cell, isMulti: boolean = false): void {
    if (!cell) {
      return;
    }
    let end: Cell = cell;

    if (isMulti) {
      let start: Cell|null = this.store.get('focus');
      if (start) {
        const range = getRange(start, end);
        this.applyRange(range);
        return;
      }
    }

    this.config.focus(cell, end);
  }

  destroy(): void {
    this.config.unregister();
  }
}
