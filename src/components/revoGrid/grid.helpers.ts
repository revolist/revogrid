import { RevoGrid } from '../../interfaces';
import reduce from 'lodash/reduce';

export const rowDefinitionByType = (newVal: Partial<RevoGrid.RowDefinition>[] = []) => {
  return reduce(
    newVal,
    (
      r: Partial<
        {
          [T in RevoGrid.DimensionRows]: {
            sizes?: Record<number, number>;
          };
        }
      >,
      v,
    ) => {
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
