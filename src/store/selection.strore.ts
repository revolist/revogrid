import {createStore, ObservableMap} from '@stencil/store';
import {setStore} from './helpers';

type RowIndex = number;
type ColIndex = number;
export type RangeI = {
    x: number;
    y: number;
    x1: number;
    y1: number;
};
export type State = {
    range: RangeI|null;
    edit: [ColIndex, RowIndex, string?] | null;
    tempRange: RangeI|null;
};
const state: State = {
    range: null,
    tempRange: null,
    edit: null
};
const store: ObservableMap<State> = createStore(state);

function getRange(start?: [ColIndex, RowIndex], end?: [ColIndex, RowIndex]): RangeI|null {
    return start && end ? {
        x: Math.min(start[0], end[0]),
        y: Math.min(start[1], end[1]),
        x1: Math.max(start[0], end[0]),
        y1: Math.max(start[1], end[1])

    } : null;
}

function setRange(start?: [ColIndex, RowIndex], end?: [ColIndex, RowIndex]): void {
    setStore(store, { range: getRange(start, end) });
    setStore(store, { edit: null });
}

function setTempRange(start?: [ColIndex, RowIndex], end?: [ColIndex, RowIndex]): void {
    setStore(store, { tempRange: getRange(start, end) });
    setStore(store, { edit: null });
}

function setEdit(cell?: [ColIndex, RowIndex, string?]) {
    setStore(store, { edit: cell });
}

export {setRange, setTempRange, setEdit};
export default store;
