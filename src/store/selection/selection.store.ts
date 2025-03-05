/**
 * Selection store
 */

import { setStore, Observable } from '../../utils';
import { getRange } from '@store';
import type { SelectionStoreState, Cell, TempRange, RangeArea, Nullable } from '@type';
import { createStore } from '@stencil/store';

function defaultState(): SelectionStoreState {
  return {
    range: null,
    tempRange: null,
    tempRangeType: null,
    focus: null,
    edit: null,
    lastCell: null,
    nextFocus: null,
  };
}

export class SelectionStore {
  readonly store: Observable<SelectionStoreState>;
  private unsubscribe: { (): void }[] = [];
  constructor() {
    this.store = createStore(defaultState());
    this.store.on('set', (key, newVal) => {
      if (key === 'tempRange' && !newVal) {
        this.store.set('tempRangeType', null);
      }
    });
  }

  onChange<Key extends keyof SelectionStoreState>(propName: Key, cb: (newValue: SelectionStoreState[Key]) => void) {
    this.unsubscribe.push(this.store.onChange(propName, cb));
  }

  clearFocus() {
    setStore(this.store, { focus: null, range: null, edit: null, tempRange: null });
  }

  setFocus(focus: Cell, end?: Cell) {
    if (!end) {
      setStore(this.store, { focus });
    } else {
      setStore(this.store, {
        focus,
        range: getRange(focus, end),
        edit: null,
        tempRange: null,
      });
    }
  }

  setNextFocus(focus: Cell) {
    setStore(this.store, { nextFocus: focus });
  }

  setTempArea(range: Nullable<TempRange> | null) {
    setStore(this.store, { tempRange: range?.area, tempRangeType: range?.type, edit: null });
  }

  clearTemp() {
    setStore(this.store, { tempRange: null });
  }

  /** Can be applied from selection change or from simple keyboard change clicks */
  setRangeArea(range: RangeArea | null) {
    setStore(this.store, { range, edit: null, tempRange: null });
  }
  setRange(start: Cell, end: Cell) {
    const range = getRange(start, end);
    this.setRangeArea(range);
  }

  setLastCell(lastCell: Cell) {
    setStore(this.store, { lastCell });
  }

  setEdit(val?: string | boolean) {
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
