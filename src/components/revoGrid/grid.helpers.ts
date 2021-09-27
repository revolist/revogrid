import { RevoGrid } from '../../interfaces';
import reduce from 'lodash/reduce';
type Result = Partial<{
  [T in RevoGrid.DimensionRows]: { sizes?: Record<number, number>; };
}>;
type RemoveResult = Partial<{
  [T in RevoGrid.DimensionRows]: number[];
}>;
export const rowDefinitionByType = (newVal: RevoGrid.RowDefinition[] = []) => {
  return reduce(newVal, (r: Result, v) => {
      if (!r[v.type]) {
        r[v.type] = {};
      }
      if (v.size) {
        if (!r[v.type].sizes) {
          r[v.type].sizes = {};
        }
        r[v.type].sizes[v.index] = v.size;
      }
      return r;
    },
    {},
  );
};

export const rowDefinitionRemoveByType = (oldVal: RevoGrid.RowDefinition[] = []) => {
  return reduce(oldVal, (r: RemoveResult, v) => {
      if (!r[v.type]) {
        r[v.type] = [];
      }
      if (v.size) {
        r[v.type].push(v.index);
      }
      return r;
    },
    {},
  );
};
