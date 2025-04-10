export type DimensionTypeRow = 'rgRow';
export type DimensionTypeCol = 'rgCol';
export type DimensionColPin = 'colPinStart' | 'colPinEnd';
export type DimensionRowPin = 'rowPinStart' | 'rowPinEnd';
export type DimensionType = DimensionTypeCol | DimensionTypeRow;
export type DimensionCols = DimensionColPin | DimensionTypeCol;
export type DimensionRows = DimensionTypeRow | DimensionRowPin;
export type MultiDimensionType = DimensionCols | DimensionRows;
