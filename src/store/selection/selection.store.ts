import { createStore } from '@stencil/store';
import { Observable, Selection } from '../../interfaces';
import { setStore } from '../../utils/store.utils';
import { getRange } from './selection.helpers';

type StoreState = Selection.SelectionStoreState;

function defaultState(): StoreState {
  return {
    range: null,
    tempRange: null,
    tempRangeType: null,
    focus: null,
    edit: null,
    lastCell: null,
  };
}

export class SelectionStore {
  readonly store: Observable<Selection.SelectionStoreState>;
  private unsubscribe: { (): void }[] = [];
  constructor() {
    this.store = createStore(defaultState());
    this.store.on('set', (key, newVal) => {
      if (key === 'tempRange' && !newVal) {
        this.store.set('tempRangeType', null);
      }
    });
  }

  onChange<Key extends keyof StoreState>(propName: Key, cb: (newValue: StoreState[Key]) => void) {
    this.unsubscribe.push(this.store.onChange(propName, cb));
  }

  clearFocus() {
    setStore(this.store, { focus: null, range: null, edit: null, tempRange: null });
  }

  setFocus(focus: Selection.Cell, end: Selection.Cell) {
    setStore(this.store, {
      focus,
      range: getRange(focus, end),
      edit: null,
      tempRange: null,
    });
  }

  setTempArea(range: Selection.TempRange | null) {
    setStore(this.store, { tempRange: range?.area, tempRangeType: range?.type, edit: null });
  }

  clearTemp() {
    setStore(this.store, { tempRange: null });
  }

  /** Can be applied from selection change or from simple keyboard change clicks */
  setRangeArea(range: Selection.RangeArea) {
    setStore(this.store, { range, edit: null, tempRange: null });
  }
  setRange(start: Selection.Cell, end: Selection.Cell) {
    this.setRangeArea(getRange(start, end));
  }

  setLastCell(lastCell: Selection.Cell) {
    setStore(this.store, { lastCell });
  }

  setEdit(val: string | boolean) {
    const focus = this.store.get('focus');
    if (focus && typeof val === 'string') {
      setStore(this.store, {
        edit: { x: focus.x, y: focus.y, val },
      });
      return;
    }
    setStore(this.store, { edit: null });
  }

  dispose() {
    this.unsubscribe.forEach(f => f());
    this.store.dispose();
  }
}
