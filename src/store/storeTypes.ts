import { RevoGrid } from '../interfaces';

export const rowTypes: RevoGrid.DimensionRows[] = ['rowPinStart', 'row', 'rowPinEnd'];
export const columnTypes: RevoGrid.DimensionCols[] = ['colPinStart', 'col', 'colPinEnd'];

export function isRowType(type: RevoGrid.DimensionRows | any): type is RevoGrid.DimensionRows {
  return rowTypes.indexOf(type) > -1;
}
