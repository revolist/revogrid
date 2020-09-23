import {generateHeader} from "./generate-header.js";

export function generateFakeDataObject(rowsNumber, colsNumber) {
    const result = [];
    const columns = {};
    const all = colsNumber * rowsNumber;
    for (let j = 0; j < all; j++) {
        let col = j%colsNumber;
        let row = j/colsNumber|0;
        if (!result[row]) {
            result[row] = {};
        }
        result[row][col] = row + ':' + col;
        if (row === 3) {
            result[row]['selected'] = 'green';
        }
        if (!columns[col]) {
            columns[col] = {
                name: generateHeader(col),
                prop: col,
                pin: j === 2 ? 'colPinStart' : j === 20 ? 'colPinEnd' : undefined,
                sortable: true,
                size: j === 5 ? 200 : undefined,
                readonly: !!(col%2),
                rowDrag: j === 2,
                /*
                cellTemplate: (h, props) => {
                    return h('div', {
                        style: {},
                        class: {
                            'inner-cell': true
                        }
                    }, props.model[props.prop] || '');
                } */
            }
        }
    }
    const pinnedTopRows = result[10] && [result[10]] || [];
    const pinnedBottomRows = result[1] && [result[1]] || [];
    let headers = Object.keys(columns).map((k) => columns[k]);
    const grouped = headers.splice(1, 4);
    /* const grouped2 = grouped.splice(0, 2);
    grouped.push({
        name: 'Grouped2',
        children: grouped2
    });


    const grouped4 = headers.splice(1, 3);
    */ 
    headers.splice(6, 0, ...[{
        name: 'Grouped',
        children: grouped
    }]);
    /*
    headers.splice(1, 0, ...[{
        name: 'Grouped3',
        children: grouped4
    }]); */
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
