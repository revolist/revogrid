import { DimensionCols, DimensionRows } from '..';

export const rowTypes: DimensionRows[] = ['rowPinStart', 'rgRow', 'rowPinEnd'];
export const columnTypes: DimensionCols[] = [
  'colPinStart',
  'rgCol',
  'colPinEnd',
];

export function isRowType(type: DimensionRows | any): type is DimensionRows {
  return rowTypes.indexOf(type) > -1;
}
