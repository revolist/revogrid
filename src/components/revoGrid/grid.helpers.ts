import reduce from 'lodash/reduce';
import { RowDefinition, DimensionRows } from '@type';

type Result = Partial<{
  [T in DimensionRows]: { sizes?: Record<number, number>; };
}>;
type RemoveResult = Partial<{
  [T in DimensionRows]: number[];
}>;
export const rowDefinitionByType = (newVal: RowDefinition[] = []) => {
  return reduce(newVal, (r: Result, v) => {
      let type = r[v.type];
      if (!type) {
        type = r[v.type] = {};
      }
      if (v.size) {
        if (!type.sizes) {
          type.sizes = {};
        }
        type.sizes[v.index] = v.size;
      }
      return r;
    },
    {},
  );
};

export const rowDefinitionRemoveByType = (oldVal: RowDefinition[] = []) => {
  return reduce(oldVal, (r: RemoveResult, v) => {
      if (!r[v.type]) {
        r[v.type] = [];
      }
      if (v.size) {
        r[v.type]?.push(v.index);
      }
      return r;
    },
    {},
  );
};
