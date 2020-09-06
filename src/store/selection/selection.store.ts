import {ObservableMap} from '@stencil/store';
import {setStore} from '../../utils/store.utils';
import {Edition, Selection} from '../../interfaces';
import {State} from '../../services/selection.store.connector';
import {getRange} from './selection.helpers';
import Cell = Selection.Cell;
import EditCell = Edition.EditCell;
import SelectionStoreConnectorI = Selection.SelectionStoreConnectorI;



export default class SelectionStore {
    public readonly store: ObservableMap<State>;
    constructor(lastCell: Cell, storePosition: Cell, private selectionStoreConnector: SelectionStoreConnectorI) {
        this.store = selectionStoreConnector.register(storePosition.y, storePosition.x) as ObservableMap<State>;
        this.setLastCell(lastCell);
    }

    get focused(): Cell|null {
        return this.store.get('focus');
    }

    get edited(): EditCell|null {
        return this.store.get('edit');
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

    change(area: Partial<Cell>, isMulti: boolean = false): void {
        this.selectionStoreConnector.change(area, isMulti);
    }

    focus(cell?: Cell, isMulti: boolean = false): void {
        if (!cell) {
            this.selectionStoreConnector.clearFocus(this.store);
            return;
        }
        let end: Cell = cell;

        if (isMulti) {
            let start: Cell|null = this.store.get('focus');
            if (start) {
                this.setRange(start, end);
                return;
            }
        }

        this.selectionStoreConnector.focus(this.store, cell, end);
    }

    destroy(): void {
        this.selectionStoreConnector.unregister(this.store);
    }
}
