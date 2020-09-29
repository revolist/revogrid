import {RevoGrid} from "../interfaces";

export const rowTypes: RevoGrid.DimensionRows[] = ['row', 'rowPinStart', 'rowPinEnd'];
export const columnTypes: RevoGrid.DimensionCols[] = ['col', 'colPinStart', 'colPinEnd'];

export function isRowType(type: RevoGrid.DimensionRows|any): type is RevoGrid.DimensionRows {
    return rowTypes.indexOf(type) > -1;
}