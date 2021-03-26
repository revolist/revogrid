import { RevoGrid } from '../interfaces';

export const rowTypes: RevoGrid.DimensionRows[] = ['rowPinStart', 'rgRow', 'rowPinEnd'];
export const columnTypes: RevoGrid.DimensionCols[] = ['colPinStart', 'rgCol', 'colPinEnd'];

export function isRowType(type: RevoGrid.DimensionRows | any): type is RevoGrid.DimensionRows {
  return rowTypes.indexOf(type) > -1;
}
