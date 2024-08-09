import { RowDefinition, DimensionRows } from '@type';

type Result = Partial<{
  [T in DimensionRows]: { sizes?: Record<number, number>; };
}>;
type RemoveResult = Partial<{
  [T in DimensionRows]: number[];
}>;
export const rowDefinitionByType = (newVal: RowDefinition[] = []) => {
  const result: Result = {};
  for (const v of newVal) {
    let rowDefs = result[v.type];
    if (!rowDefs) {
      rowDefs = result[v.type] = {};
    }
    if (v.size) {
      if (!rowDefs.sizes) {
        rowDefs.sizes = {};
      }
      rowDefs.sizes[v.index] = v.size;
    }
  }
  return result;
};

export const rowDefinitionRemoveByType = (oldVal: RowDefinition[] = []) => {
  const result: RemoveResult = {};
  for (const v of oldVal) {
    let rowDefs = result[v.type];
    if (!rowDefs) {
      rowDefs = result[v.type] = [];
    }
    if (v.size) {
      rowDefs.push(v.index);
    }
  }
  return result;
};
