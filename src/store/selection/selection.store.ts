import { createStore } from '@stencil/store';
import { Observable, Selection } from '../../interfaces';
import { setStore } from '../../utils/store.utils';
import { getRange } from './selection.helpers';

function defaultState(): Selection.SelectionStoreState {
  return {
    range: null,
    tempRange: null,
    focus: null,
    edit: null,
    lastCell: null,
  };
}

export class SelectionStore {
  readonly store: Observable<Selection.SelectionStoreState>;
  constructor() {
    this.store = createStore(defaultState());
  }

  clearFocus(): void {
    setStore(this.store, { focus: null, range: null, edit: null, tempRange: null });
  }

  setFocus(focus: Selection.Cell, end: Selection.Cell): void {
    setStore(this.store, {
      focus,
      range: getRange(focus, end),
      edit: null,
      tempRange: null,
    });
  }

  setTempArea(tempRange: Selection.RangeArea | null): void {
    setStore(this.store, { tempRange, edit: null });
  }

  setTempRange(start: Selection.Cell, end: Selection.Cell): void {
    this.setTempArea(getRange(start, end));
  }

  clearTemp(): void {
    setStore(this.store, { tempRange: null });
  }

  /** Can be applied from selection change or from simple keyboard change clicks */
  setRangeArea(range: Selection.RangeArea): void {
    setStore(this.store, { range, edit: null, tempRange: null });
  }
  setRange(start: Selection.Cell, end: Selection.Cell): void {
    this.setRangeArea(getRange(start, end));
  }

  setLastCell(lastCell: Selection.Cell): void {
    setStore(this.store, { lastCell });
  }

  setEdit(val: string | boolean): void {
    const focus = this.store.get('focus');
    if (focus && typeof val === 'string') {
      setStore(this.store, {
        edit: { x: focus.x, y: focus.y, val },
      });
      return;
    }
    setStore(this.store, { edit: null });
  }

  dispose(): void {
    this.store.dispose();
  }
}
