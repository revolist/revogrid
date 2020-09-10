import {Edition, Selection} from '../interfaces';
import {createStore, ObservableMap} from '@stencil/store';
import {setStore} from '../utils/store.utils';
import {cropCellToMax, getRange, nextCell} from '../store/selection/selection.helpers';

import Cell = Selection.Cell;
import EditCell = Edition.EditCell;

type StoresMatrix = {[y: number]: {[x: number]:  ObservableMap<Selection.SelectionStoreState>}};
const state: Selection.SelectionStoreState = {
    range: null,
    tempRange: null,
    focus: null,
    edit: null,
    lastCell: null
};
export default class SelectionStoreConnector {
    private readonly stores: StoresMatrix = {};
    private focusedStore: ObservableMap<Selection.SelectionStoreState>|null = null;

    register({x, y}: Selection.Cell): ObservableMap<Selection.SelectionStoreState> {
        const store: ObservableMap<Selection.SelectionStoreState> = createStore({ ...state });
        if (!this.stores[y]) {
            this.stores[y] = {};
        }
        if (this.stores[y][x]) {
            // Store already registered. Do not register twice
            return this.stores[y][x];
        }
        this.stores[y][x] = store;
        return store;
    }

    focus(store: ObservableMap<Selection.SelectionStoreState>, {focus, end}: {focus: Cell; end: Cell}): void {
        let currentStorePointer: Selection.Cell;
        // clear all stores focus leave only active one
        for (let y in this.stores) {
            for (let x in this.stores[y]) {
                const s = this.stores[y][x];
                if (s !== store) {
                    this.clearFocus(s);
                } else {
                    currentStorePointer = { x: parseInt(x, 10), y: parseInt(y, 10) };
                }
            }
        }
        if (!currentStorePointer) {
            throw new Error('Store not found');
        }

        // check is focus in next store
        const lastCell: Cell = store.get('lastCell');
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
                    const nextLastCell = nextStore?.get('lastCell');
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

        setStore(store, {
            focus,
            range: getRange(focus, end),
            edit: null,
            tempRange: null
        });
        this.focusedStore = store;
    }

    clearAll(): void {
        for (let y in this.stores) {
            for (let x in this.stores[y]) {
                this.clearFocus(this.stores[y][x]);
            }
        }
    }

    clearFocus(s: ObservableMap<Selection.SelectionStoreState>): void {
        setStore(s, {
            focus: null,
            range: null,
            edit: null,
            tempRange: null
        });
    }

    setRange(store: ObservableMap<Selection.SelectionStoreState>, start: Cell, end: Cell): void {
        const range = getRange(start, end);
        setStore(store, {
            range,
            edit: null,
            tempRange: null
        });
    }

    get edit(): EditCell|undefined {
        return this.focusedStore?.get('edit');
    }

    setEdit(val: string|boolean): void {
        if (!this.focusedStore) {
            return;
        }

        const focus: Cell|null = this.focused;
        if (focus && typeof val === 'string') { // !dataProvider.isReadOnly(focus.y, focus.x)
            setStore(this.focusedStore, {
                edit: {
                    x: focus.x,
                    y: focus.y,
                    val
                }
            });
            return;
        }
        setStore(this.focusedStore, { edit: null });

    }

    get focused(): Cell|undefined {
        return this.focusedStore?.get('focus');
    }

    change({changes, isMulti}: {changes: Partial<Cell>, isMulti?: boolean}): void {
        if (!this.focusedStore) {
            return;
        }

        const range = this.focusedStore.get('range');
        const focus = this.focusedStore.get('focus');

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
            this.setRange(this.focusedStore, start, end);
        } else {
            this.focus(this.focusedStore, {focus: start, end: start});
        }
    }

    unregister(store: ObservableMap<Selection.SelectionStoreState>): void {
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

    private getXStores(y: number): { [p: number]: ObservableMap<Selection.SelectionStoreState> } {
        return this.stores[y];
    }

    private getYStores(x: number): { [p: number]: ObservableMap<Selection.SelectionStoreState> } {
        const stores: { [p: number]: ObservableMap<Selection.SelectionStoreState> } = {};
        for (let i in this.stores) {
            stores[i] = this.stores[i][x];
        }
        return stores;
    }
}

