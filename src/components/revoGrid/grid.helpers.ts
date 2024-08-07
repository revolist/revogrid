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
    if (!result[v.type]) {
      result[v.type] = {};
    }
    if (v.size) {
      if (!result[v.type].sizes) {
        result[v.type].sizes = {};
      }
      result[v.type].sizes[v.index] = v.size;
    }
  }
  return result;
};

export const rowDefinitionRemoveByType = (oldVal: RowDefinition[] = []) => {
  const result: RemoveResult = {};
  for (const v of oldVal) {
    if (!result[v.type]) {
      result[v.type] = [];
    }
    if (v.size) {
      result[v.type].push(v.index);
    }
  }
  return result;
};

