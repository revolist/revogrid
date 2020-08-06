import {createStore, ObservableMap} from '@stencil/store';
import {setStore} from '../../utils/store.utils';
import {Edition, Selection} from '../../interfaces';
import RangeArea = Selection.RangeArea;
import Cell = Selection.Cell;
import EditCell = Edition.EditCell;

export type State = {
    range: RangeArea|null;
    tempRange: RangeArea|null;
    focus: Cell|null;
    edit: EditCell | null;
};
const state: State = {
    range: null,
    tempRange: null,
    focus: null,
    edit: null
};
const store: ObservableMap<State> = createStore(state);

function getRange(start?: Cell, end?: Cell): RangeArea|null {
    return start && end ? {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        x1: Math.max(start.x, end.x),
        y1: Math.max(start.y, end.y)
    } : null;
}

function setRange(start: Cell, end: Cell): void {
    const range = getRange(start, end);
    setStore(store, { range });
    setStore(store, { edit: null });
    setStore(store, { tempRange: null });
}

function setTempRange(start?: Cell, end?: Cell): void {
    setStore(store, { tempRange: getRange(start, end) });
    setStore(store, { edit: null });
}

function setFocus(start: Cell): void {
    setStore(store, { focus: start });
}

function setEdit(cell?: EditCell) {
    setStore(store, { edit: cell });
}

export {setRange, setTempRange, setEdit, setFocus};
export default store;
