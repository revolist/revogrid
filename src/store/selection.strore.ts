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
type State = {
    range: RangeI|null;
    tempRange: RangeI|null;
};
const state: State = {
    range: null,
    tempRange: null
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
}

function setTempRange(start?: [ColIndex, RowIndex], end?: [ColIndex, RowIndex]): void {
    setStore(store, { tempRange: getRange(start, end) });
}

export {setRange, setTempRange};
export default store;
