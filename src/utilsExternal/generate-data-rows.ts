
export default function generateDataRows(rowsNumber: number, colsNumber: number): {[key: string]: string}[] {
    const result: {[key: string]: string}[] = [];
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