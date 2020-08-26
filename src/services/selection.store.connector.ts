import {Edition, Selection} from '../interfaces';
import {createStore, ObservableMap} from '@stencil/store';
import {setStore} from '../utils/store.utils';
import {cropCellToMax, getRange, nextCell} from '../store/selection/selection.helpers';

import RangeArea = Selection.RangeArea;
import Cell = Selection.Cell;
import EditCell = Edition.EditCell;
import SelectionStoreConnectorI = Selection.SelectionStoreConnectorI;

export type State = {
    range: RangeArea|null;
    tempRange: RangeArea|null;
    focus: Cell|null;
    edit: EditCell|null;
    lastCell: Cell|null;
};
type StoresMatrix = {[y: number]: {[x: number]:  ObservableMap<State>}};
const state: State = {
    range: null,
    tempRange: null,
    focus: null,
    edit: null,
    lastCell: null
};
export default class SelectionStoreConnector implements SelectionStoreConnectorI {
    private readonly stores: StoresMatrix = {};
    private focusedStore: ObservableMap<State>|null = null;

    register(y: number, x: number): ObservableMap<State> {
        const store: ObservableMap<State> = createStore({ ...state });
        if (!this.stores[y]) {
            this.stores[y] = {};
        }
        if (this.stores[y][x]) {
            throw new Error('Store already registered.');
        }
        this.stores[y][x] = store;
        return store;
    }

    focus(store: ObservableMap<State>, focus: Selection.Cell, end: Selection.Cell): void {
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


        if (nextItem) {
            let nextStore;
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

            // if next store present - update
            if (nextStore) {
                let item = {...focus, ...nextItem};
                this.focus(nextStore, item, item);
                return;
            }
        }
        focus = cropCellToMax(focus, lastCell);

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

    clearFocus(s: ObservableMap<State>): void {
        setStore(s, {
            focus: null,
            range: null,
            edit: null,
            tempRange: null
        });
    }

    setRange(store: ObservableMap<State>, start: Cell, end: Cell): void {
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

    change(changes: Partial<Cell>, isMulti: boolean = false): void {
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
            this.focus(this.focusedStore, start, start);
        }
    }

    unregister(store: ObservableMap<State>): void {
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

    private getXStores(y: number): { [p: number]: ObservableMap<State> } {
        return this.stores[y];
    }

    private getYStores(x: number): { [p: number]: ObservableMap<State> } {
        const stores: { [p: number]: ObservableMap<State> } = {};
        for (let i in this.stores) {
            stores[i] = this.stores[i][x];
        }
        return stores;
    }
}

