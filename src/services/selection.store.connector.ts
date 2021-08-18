import { Edition, Selection, RevoGrid } from '../interfaces';
import { cropCellToMax, isHiddenStore, nextCell } from '../store/selection/selection.helpers';
import { SelectionStore } from '../store/selection/selection.store';

import Cell = Selection.Cell;
import EditCellStore = Edition.EditCellStore;

type StoreByDimension = Record<number, SelectionStore>;
type FocusedStore = {
  entity: SelectionStore;
  cell: Selection.Cell;
  position: Selection.Cell;
};

type StoresMapping<T> = { [xOrY: number]: Partial<T> };

export const EMPTY_INDEX = -1;

export default class SelectionStoreConnector {
  // dirty flag required to cleanup whole store in case visibility of panels changed
  private dirty = false;
  readonly stores: { [y: number]: { [x: number]: SelectionStore } } = {};

  readonly columnStores: StoreByDimension = {};
  readonly rowStores: { [y: number]: SelectionStore } = {};

  /**
   * Helpers for data conversion
   */
  readonly storesByType: Partial<Record<RevoGrid.MultiDimensionType, number>> = {};
  readonly storesXToType: StoresMapping<RevoGrid.DimensionCols> = {};
  readonly storesYToType: StoresMapping<RevoGrid.DimensionRows> = {};

  get focusedStore(): FocusedStore | null {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        const focused = this.stores[y][x]?.store.get('focus');
        if (focused) {
          return {
            entity: this.stores[y][x],
            cell: focused,
            position: {
              x: parseInt(x, 10),
              y: parseInt(y, 10),
            },
          };
        }
      }
    }
    return null;
  }

  get edit(): EditCellStore | undefined {
    return this.focusedStore?.entity.store.get('edit');
  }

  get focused(): Cell | undefined {
    return this.focusedStore?.entity.store.get('focus');
  }

  private readonly sections: Element[] = [];

  registerSection(e?: Element) {
    if (!e) {
      this.sections.length = 0;
      // some elements removed, rebuild stores
      this.dirty = true;
      return;
    }
    if (this.sections.indexOf(e) === -1) {
      this.sections.push(e);
    }
  }

  // check if require to cleanup all stores
  beforeUpdate() {
    if (this.dirty) {
      for (let y in this.stores) {
        for (let x in this.stores[y]) {
          this.stores[y][x].dispose();
        }
      }
      this.dirty = false;
    }
  }

  registerColumn(x: number, type: RevoGrid.DimensionCols): SelectionStore {

    // if hidden just create store but no operations needed
    if (isHiddenStore(x)) {
      return new SelectionStore();
    }
    if (this.columnStores[x]) {
      return this.columnStores[x];
    }
    this.columnStores[x] = new SelectionStore();
    // build cross linking type to position
    this.storesByType[type] = x;
    this.storesXToType[x] = type;
    return this.columnStores[x];
  }

  registerRow(y: number, type: RevoGrid.DimensionRows): SelectionStore {
    // if hidden just create store
    if (isHiddenStore(y)) {
      return new SelectionStore();
    }
    if (this.rowStores[y]) {
      return this.rowStores[y];
    }
    this.rowStores[y] = new SelectionStore();
    // build cross linking type to position
    this.storesByType[type] = y;
    this.storesYToType[y] = type;
    return this.rowStores[y];
  }

  /**
   * Cross store proxy, based on multiple dimensions
   */
  register({ x, y }: Selection.Cell): SelectionStore {
    // if hidden just create store
    if (isHiddenStore(x) || isHiddenStore(y)) {
      return new SelectionStore();
    }
    if (!this.stores[y]) {
      this.stores[y] = {};
    }
    if (this.stores[y][x]) {
      // Store already registered. Do not register twice
      return this.stores[y][x];
    }
    this.stores[y][x] = new SelectionStore();
    // proxy update, column store trigger only range area
    this.stores[y][x]?.onChange('range', c => {
      this.columnStores[x].setRangeArea(c);
      this.rowStores[y].setRangeArea(c);
    });
    // clean up on remove
    this.stores[y][x]?.store.on('dispose', () => this.destroy(x, y));
    return this.stores[y][x];
  }

  private destroy(x: number, y: number) {
    this.columnStores[x]?.dispose();
    this.rowStores[y]?.dispose();

    delete this.rowStores[y];
    delete this.columnStores[x];
    // clear x cross link
    if (this.storesXToType[x]) {
      const type = this.storesXToType[x];
      delete this.storesXToType[x];
      delete this.storesByType[type];
    }
    // clear y cross link
    if (this.storesYToType[y]) {
      const type = this.storesYToType[y];
      delete this.storesYToType[y];
      delete this.storesByType[type];
    }
    if (this.stores[y]) {
      delete this.stores[y][x];
    }
    // clear empty rows
    if (!Object.keys(this.stores[y] || {}).length) {
      delete this.stores[y];
    }
  }

  setEditByCell<T extends Selection.Cell>(storePos: T, editCell: T) {
    this.focusByCell(storePos, editCell, editCell);
    this.setEdit('');
  }

  focusByCell<T extends Selection.Cell>(storePos: T, start: T, end: T) {
    const store = this.stores[storePos.y][storePos.x];
    this.focus(store, { focus: start, end });
  }

  focus(store: SelectionStore, { focus, end }: { focus: Cell; end: Cell }) {
    let currentStorePointer: Selection.Cell;
    // clear all stores focus leave only active one
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        const s = this.stores[y][x];
        // clear other stores, only one area can be selected
        if (s !== store) {
          s.clearFocus();
        } else {
          currentStorePointer = { x: parseInt(x, 10), y: parseInt(y, 10) };
        }
      }
    }
    if (!currentStorePointer) {
      return;
    }

    // check is focus in next store
    const lastCell = store.store.get('lastCell');
    // item in new store
    const nextItem: Partial<Cell> | null = nextCell(focus, lastCell);

    let nextStore;
    if (nextItem) {
      for (let i in nextItem) {
        let type: keyof Cell = i as keyof Cell;
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
      let item = { ...focus, ...nextItem };
      this.focus(nextStore, { focus: item, end: item });
      return;
    }

    focus = cropCellToMax(focus, lastCell);
    end = cropCellToMax(end, lastCell);

    store.setFocus(focus, end);
  }

  clearAll(): void {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        this.stores[y][x]?.clearFocus();
      }
    }
  }

  setEdit(val: string | boolean) {
    if (!this.focusedStore) {
      return;
    }
    this.focusedStore.entity.setEdit(val);
  }

  private getXStores(y: number) {
    return this.stores[y];
  }

  private getYStores(x: number) {
    const stores: { [p: number]: SelectionStore } = {};
    for (let i in this.stores) {
      stores[i] = this.stores[i][x];
    }
    return stores;
  }
}
