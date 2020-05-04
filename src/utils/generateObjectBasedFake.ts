import {generateHeader} from "./generateAlphabetHeader";

export default function generateFakeDataObject(rowsNumber:number, colsNumber: number) {
  const result: {[key: string]: {[key: string]: DataFormat}} = {};
  const headers: {[key: string]: ColumnDataSchema} = {};
  const all = colsNumber * rowsNumber;
  for (let j: number = 0; j < all; j++) {
    let col: number = j%colsNumber;
    let row: number = j/colsNumber|0;
    if (!result[row]) {
      result[row] = {};
    }
    result[row][col] = row + ':' + col;
    if (!headers[col]) {
      headers[col] = {
        name: generateHeader(col),
        prop: col.toString()
      }
    }
  }
  return {
    rows: result,
    headers: headers
  };
}
