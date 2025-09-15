import { cropCellToMax, nextCell, SelectionStore } from '@store';
import type {
  MultiDimensionType,
  DimensionCols,
  DimensionRows,
  Cell,
  EditCellStore,
  RangeArea,
} from '@type';

type StoreByDimension = Record<number, SelectionStore>;
type FocusedStore = {
  entity: SelectionStore;
  cell: Cell;
  position: Cell;
};

type StoresMapping<T> = { [xOrY: number]: Partial<T> };

export class SelectionStoreConnector {
  readonly stores: { [y: number]: { [x: number]: SelectionStore } } = {};

  readonly columnStores: StoreByDimension = {};
  readonly rowStores: { [y: number]: SelectionStore } = {};

  /**
   * Helpers for data conversion
   */
  readonly storesByType: Partial<Record<MultiDimensionType, number>> = {};
  readonly storesXToType: StoresMapping<DimensionCols> = {};
  readonly storesYToType: StoresMapping<DimensionRows> = {};

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

  get edit(): EditCellStore | null | undefined {
    return this.focusedStore?.entity.store.get('edit');
  }

  get focused(): Cell | null | undefined {
    return this.focusedStore?.entity.store.get('focus');
  }

  get selectedRange(): RangeArea | null | undefined {
    return this.focusedStore?.entity.store.get('range');
  }

  registerColumn(x: number, type: DimensionCols): SelectionStore {
    if (this.columnStores[x]) {
      return this.columnStores[x];
    }
    this.columnStores[x] = new SelectionStore();
    // build cross-linking type to position
    this.storesByType[type] = x;
    this.storesXToType[x] = type;
    return this.columnStores[x];
  }

  registerRow(y: number, type: DimensionRows): SelectionStore {
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
  register({ x, y }: Cell): SelectionStore {
    if (!this.stores[y]) {
      this.stores[y] = {};
    }
    let store = this.stores[y][x];
    if (store) {
      // Store already registered. Do not register twice
      return store;
    }
    this.stores[y][x] = store = new SelectionStore();
    // proxy update, column store trigger only range area
    store.onChange('range', c => {
      const last = store.store.get('lastCell');
      if (!last?.x || !last?.y) {
        return;
      }
      this.columnStores[x].setRangeArea(c);
      this.rowStores[y].setRangeArea(c);
    });
    // clean up on remove
    store.store.on('dispose', () => this.destroy(x, y));
    return store;
  }

  private destroy(x: number, y: number) {
    this.columnStores[x]?.dispose();
    this.rowStores[y]?.dispose();

    delete this.rowStores[y];
    delete this.columnStores[x];
    // clear x cross-link
    if (this.storesXToType[x]) {
      const type = this.storesXToType[x];
      delete this.storesXToType[x];
      delete this.storesByType[type];
    }
    // clear y cross-link
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

  setEditByCell<T extends Cell>(storePos: T, editCell: T) {
    this.focusByCell(storePos, editCell, editCell);
    this.setEdit('');
  }

  /**
   * Sets the next focus cell before the current one.
   * 
   * @param focus - The cell to set as the next focus.
   */
  beforeNextFocusCell(focus: Cell) {
    // If there is no focused store, return early.
    if (!this.focusedStore) {
      return;
    }

    // Get the next store based on the current focus and the last cell.
    const lastCell = this.focusedStore.entity.store.get('lastCell');
    const next = lastCell && this.getNextStore(focus, this.focusedStore.position, lastCell);

    // Set the next focus cell in the store.
    next?.store?.setNextFocus({ ...focus, ...next.item });
  }

  focusByCell<T extends Cell>(storePos: T, start: T, end: T) {
    const store = this.stores[storePos.y][storePos.x];
    this.focus(store, { focus: start, end });
  }

  focus(store: SelectionStore, { focus, end }: { focus: Cell; end: Cell }) {
    const currentStorePointer = this.getCurrentStorePointer(store);
    if (!currentStorePointer) {
      return null;
    }

    // check for the focus in nearby store/viewport
    const lastCell = store.store.get('lastCell');
    const next = lastCell && this.getNextStore(focus, currentStorePointer, lastCell);

    // if next store present - update
    if (next?.store) {
      const item = { ...focus, ...next.item };
      this.focus(next.store, { focus: item, end: item });
      return null;
    }

    if (lastCell) {
      focus = cropCellToMax(focus, lastCell);
      end = cropCellToMax(end, lastCell);  
    }
    store.setFocus(focus, end);
    return focus;
  }

  /**
   * Retrieves the current store pointer based on the active store.
   * Clears focus from all stores except the active one.
   */
  getCurrentStorePointer(store: SelectionStore) {
    let currentStorePointer: Cell | undefined;

    // Iterate through all stores
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        const s = this.stores[y][x];

        // Clear focus from stores other than the active one
        if (s !== store) {
          s.clearFocus();
        } else {
          // Update the current store pointer with the active store coordinates
          currentStorePointer = { 
            x: parseInt(x, 10), 
            y: parseInt(y, 10) 
          };
        }
      }
    }

    return currentStorePointer;
  }

  /**
   * Retrieves the next store based on the focus cell and current store pointer.
   * If the next store exists, returns an object with the next store and the item in the new store.
   * If the next store does not exist, returns null.
   */
  getNextStore(
    focus: Cell,
    currentStorePointer: Cell,
    lastCell: Cell,
  ) {
    // item in new store
    const nextItem: Partial<Cell> | null = nextCell(focus, lastCell);

    let nextStore: SelectionStore | undefined;
    if (nextItem) {
      Object.entries(nextItem).forEach(([type, nextItemCoord]: [keyof Cell, number]) => {
        let stores;
        switch (type) {
          case 'x':
            // Get the X stores for the current Y coordinate of the current store pointer
            stores = this.getXStores(currentStorePointer.y);
            break;
          case 'y':
            // Get the Y stores for the current X coordinate of the current store pointer
            stores = this.getYStores(currentStorePointer.x);
            break;
        }

        // Get the next store based on the item in the new store
        if (nextItemCoord >= 0) {
          nextStore = stores[++currentStorePointer[type]];
        } else {
          nextStore = stores[--currentStorePointer[type]];
          const nextLastCell = nextStore?.store.get('lastCell');
          if (nextLastCell) {
            nextItem[type] = nextLastCell[type] + nextItemCoord;
          }
        }
    });
    }
    // if last cell is empty store is empty, no next store
    const lastCellNext = nextStore?.store.get('lastCell');
    if (!lastCellNext?.x || !lastCellNext?.y) {
      nextStore = undefined;
    }
    return {
      store: nextStore,
      item: nextItem,
    };
  }

  clearAll() {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        this.stores[y][x]?.clearFocus();
      }
    }
  }

  setEdit(val?: string | boolean) {
    if (!this.focusedStore) {
      return;
    }
    this.focusedStore.entity.setEdit(val);
  }

  /**
   * Select all cells across all stores
   */
  selectAll() {
    for (let y in this.stores) {
      for (let x in this.stores[y]) {
        const store = this.stores[y][x];
        if (!store) {
          continue;
        }
        const lastCell = store.store.get('lastCell');
        if (lastCell) {
          store.setRange(
            { x: 0, y: 0 },
            { x: lastCell.x - 1, y: lastCell.y - 1 },
          );
        }
      }
    }
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
