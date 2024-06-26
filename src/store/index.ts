import type { DimensionCols, DimensionRows } from '@type';

export * from './dataSource';
export * from './dimension';
export * from './selection';
export * from './viewport';

export const rowTypes: DimensionRows[] = ['rowPinStart', 'rgRow', 'rowPinEnd'];
export const columnTypes: DimensionCols[] = [
  'colPinStart',
  'rgCol',
  'colPinEnd',
];

export function isRowType(type: DimensionRows | any): type is DimensionRows {
  return rowTypes.indexOf(type) > -1;
}
