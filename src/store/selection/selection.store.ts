import {ObservableMap} from '@stencil/store';
import {setStore} from '../../utils/store.utils';
import {Selection} from '../../interfaces';
import selectionStoreConnector, {State} from './selection.store.connector';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;



export default class SelectionStore {
    public readonly store: ObservableMap<State>;
    constructor(lastCell: Cell, storePosition: Cell) {
        this.store = selectionStoreConnector.register(storePosition.y, storePosition.x);
        this.setLastCell(lastCell);
    }

    setLastCell(lastCell: Cell): void {
        // todo: for existing need to update
        setStore(this.store, { lastCell });
    }

    setRange(start: Cell, end: Cell): void {
        const range = getRange(start, end);
        setStore(this.store, {
            range,
            edit: null,
            tempRange: null
        });
    }

    setTempRange(start: Cell, end: Cell): void {
        setStore(this.store, { tempRange: getRange(start, end) });
        setStore(this.store, { edit: null });
    }

    focus(cell: Cell, isMulti: boolean = false): void {
        let end: Cell = cell;

        if (isMulti) {
            let start: Cell|null = this.store.get('focus');
            if (start) {
                this.setRange(start, end);
                return;
            }
        }

        selectionStoreConnector.focus(this.store, cell, end);
    }

    destroy(): void {
        selectionStoreConnector.unregister(this.store);
    }
}
