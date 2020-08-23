import {generateHeader} from "./generate-header.js";

export function generateFakeDataObject(rowsNumber, colsNumber) {
    const result = [];
    const headers = [];
    const all = colsNumber * rowsNumber;
    for (let j = 0; j < all; j++) {
        let col = j%colsNumber;
        let row = j/colsNumber|0;
        if (!result[row]) {
            result[row] = {};
        }
        result[row][col] = row + ':' + col;
        if (!headers[col]) {
            headers[col] = {
                name: generateHeader(col),
                prop: col,
                pin: j === 4 || j === 10 ? 'colPinStart' : j === 6 || j === 9 ? 'colPinEnd' : undefined,
                size: j === 5 ? 200 : undefined,
                readonly: !!(col%2),
                cellTemplate: (h, props) => {
                    return h('div', {
                        style: {
                            // backgroundColor: j%2 ? 'red' : undefined
                        },
                        class: {
                            'inner-cell': true
                        }
                    }, props.model[props.prop] || '');
                }
            }
        }
    }
    const pinnedTopRows = result[10] && [result[10]] || [];
    const pinnedBottomRows = result[1] && [result[1]] || [];
    return {
        rows: result,
        pinnedTopRows,
        pinnedBottomRows,
        headers
    };
}

export function generateData(rowsNumber, colsNumber) {
    const result = [];
    const all = colsNumber * rowsNumber;
    for (let j = 0; j < all; j++) {
        let col = j%colsNumber;
        let row = j/colsNumber|0;
        if (!result[row]) {
            result[row] = {};
        }
        result[row][col] = row + ':' + col;
    }
    return result;
}

export function generateFakeData(rowsNumber, colsNumber) {
    const result = [];
    const rowData = [];
    const headers = [];
    for (let j = 0; j < colsNumber; j++) {
        rowData.push(j.toString());
        headers.push({
            prop: j,
            pin: j === 4 ? 'start' : undefined,
            size: j === 5 ? 200 : undefined,
            name: generateHeader(j),
            cellTemplate: (h, props) => {
                return h('div', {
                    style: {
                        // backgroundColor: j%2 ? 'red' : undefined
                    },
                    class: {
                        'inner-cell': true
                    }
                }, props.model[props.prop] || '');
            }
        });
    }
    for (let i = 0; i < rowsNumber; i++) {
        result.push(rowData);
    }
    return {
        rows: result,
        headers: headers
    };
}
