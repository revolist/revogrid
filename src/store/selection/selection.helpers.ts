import {Selection} from '../../interfaces';
import Cell = Selection.Cell;
import RangeArea = Selection.RangeArea;

export function nextCell(cell: Cell, lastCell: Cell): Partial<Cell>|null {
    const nextItem: Partial<Cell> = {};
    let types: (keyof Cell)[] = ['x', 'y'];

    // previous item check
    for (let t of types) {
        if (cell[t] < 0) {
            nextItem[t] = cell[t];
            return nextItem;
        }
    }
    // next item check
    for (let t of types) {
        if (cell[t] >= lastCell[t]) {
            nextItem[t] = cell[t] - lastCell[t];
            return nextItem;
        }
    }
    return null;
}

export function cropCellToMax(cell: Cell, lastCell: Cell): Cell {
    const newCell: Cell = {...cell};
    let types: (keyof Cell)[] = ['x', 'y'];
    // previous item check
    for (let t of types) {
        if (cell[t] < 0) {
            newCell[t] = 0;
        }
    }
    // next item check
    for (let t of types) {
        if (cell[t] >= lastCell[t]) {
            newCell[t] = lastCell[t] - 1;
        }
    }
    return newCell;
}

export function getRange(start?: Cell, end?: Cell): RangeArea|null {
    return start && end ? {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        x1: Math.max(start.x, end.x),
        y1: Math.max(start.y, end.y)
    } : null;
}

/**
 * 
 * @param a start, x1 and y1 should not be equal 'b' in other case range will be empty
 * @param b end
 */
export function substractRange(a: RangeArea, b: RangeArea): RangeArea {
    let range =  {...b};
    if (a.x1 === b.x1) {
        range.x = a.x1;
        range.x1 = a.x1;
    } else {
        range.x = a.x1 + 1;
    }
    if (a.y1 === b.y1) {
        range.y = a.y1;
        range.y1 = a.y1;
    } else {
        range.y = a.y1 + 1;
    }
    return range;
}

