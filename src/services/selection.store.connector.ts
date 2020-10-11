import {Edition, Selection} from '../interfaces';
import {cropCellToMax, nextCell} from '../store/selection/selection.helpers';
import { SelectionStore } from '../store/selection/selection.store';

import Cell = Selection.Cell;
import EditCell = Edition.EditCell;

type StoresMatrix = {[y: number]: {[x: number]:  SelectionStore}};

export default class SelectionStoreConnector {
  private readonly stores: StoresMatrix = {};

  readonly columnStores: {[x: number]:  SelectionStore} = {};

  readonly rowStores: {[y: number]:  SelectionStore} = {};
  

  get focusedStore(): SelectionStore|null {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        if (this.stores[y][x].store.get('focus')) {
          return this.stores[y][x];
        }
      }
    }
    return null;
  }

  registerColumn(x: number): SelectionStore {
    if (this.columnStores[x]) {
      return this.columnStores[x];
    }
    this.columnStores[x] = new SelectionStore();
    return this.columnStores[x];
  }

  registerRow(y: number): SelectionStore {
    if (this.rowStores[y]) {
      return this.rowStores[y];
    }
    this.rowStores[y] = new SelectionStore();
    return this.rowStores[y];
  }

  register({x, y}: Selection.Cell): SelectionStore {
    if (!this.stores[y]) {
      this.stores[y] = {};
    }
    if (this.stores[y][x]) {
      // Store already registered. Do not register twice
      return this.stores[y][x];
    }
    this.stores[y][x] = new SelectionStore();
    this.stores[y][x]?.store.onChange('range', (c) => {
      this.columnStores[x].setRangeArea(c);
      this.rowStores[y].setRangeArea(c);
    });
    return this.stores[y][x];
  }

  setEditByCell({x, y}: Selection.Cell, editCell: Selection.Cell): void {
    const store = this.stores[y][x];
    this.focus(store, { focus: editCell, end: editCell });
    this.setEdit('');
  }

  focus(store: SelectionStore, {focus, end}: {focus: Cell; end: Cell}): void {
    let currentStorePointer: Selection.Cell;
    // clear all stores focus leave only active one
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        const s = this.stores[y][x];
        if (s !== store) {
          s.clearFocus();
        } else {
          currentStorePointer = { x: parseInt(x, 10), y: parseInt(y, 10) };
        }
      }
    }
    if (!currentStorePointer) {
      throw new Error('Store not found');
    }

    // check is focus in next store
    const lastCell: Cell = store.store.get('lastCell');
    // item in new store
    const nextItem: Partial<Cell>|null = nextCell(focus, lastCell);

    let nextStore;
    if (nextItem) {
      for (let i in nextItem) {
        let type: keyof Cell= i as keyof Cell;
        let stores;
        switch (type) {
          case 'x':
            stores = this.getXStores(currentStorePointer.y);
            break;
          case 'y':
            stores = this.getYStores(currentStorePointer.x);
            break;
        }
        if (nextItem[type] >= 0) {
          nextStore = stores[++currentStorePointer[type]];
        } else {
          nextStore = stores[--currentStorePointer[type]];
          const nextLastCell = nextStore?.store.get('lastCell');
          if (nextLastCell) {
            nextItem[type] = nextLastCell[type] + nextItem[type];
          }
        }
      }
    }

    // if next store present - update
    if (nextStore) {
      let item = {...focus, ...nextItem};
      this.focus(nextStore, { focus: item, end: item });
      return;
    }

    focus = cropCellToMax(focus, lastCell);
    end = cropCellToMax(focus, lastCell);

    store.setFocus(focus, end);
  }

  clearAll(): void {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        this.stores[y][x]?.clearFocus();
      }
    }
  }

  get edit(): EditCell|undefined {
    return this.focusedStore?.store.get('edit');
  }

  get focused(): Cell|undefined {
    return this.focusedStore?.store.get('focus');
  }

  setEdit(val: string|boolean): void {
    if (!this.focusedStore) {
      return;
    }
    this.focusedStore.setEdit(val);
  }

  change({changes, isMulti}: {changes: Partial<Cell>, isMulti?: boolean}): void {
    if (!this.focusedStore) {
      return;
    }

    const range = this.focusedStore.store.get('range');
    const focus = this.focusedStore.store.get('focus');

    if (!range || !focus) {
      return;
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

    if (isMulti) {
      this.focusedStore.setRange(start, end);
    } else {
      this.focus(this.focusedStore, {focus: start, end: start});
    }
  }

  unregister(store: SelectionStore): void {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        if (this.stores[y][x] === store) {
          delete this.stores[y][x]
          break;
        }
      }
    }
    store.dispose();
  }
  

  private getXStores(y: number): { [p: number]: SelectionStore } {
    return this.stores[y];
  }

  private getYStores(x: number): { [p: number]: SelectionStore } {
    const stores: { [p: number]: SelectionStore } = {};
    for (let i in this.stores) {
      stores[i] = this.stores[i][x];
    }
    return stores;
  }
}

