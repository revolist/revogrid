import isArray from 'lodash/isArray';
import map from 'lodash/map';
import { ColumnCollection } from '../../services/column.data.provider';
import { ColumnItems } from '../../services/dimension.provider';
import { Group as StoreGroup } from '@store';
import { BasePlugin } from '../base.plugin';
import { DimensionCols } from '@type';
import { ColumnGrouping, ColumnRegular } from '@type';
interface Group extends StoreGroup {
  level: number;
}
export type ColumnGroupingCollection = Record<DimensionCols, Group[]>;

export default class GroupingColumnPlugin extends BasePlugin {
  static gatherGroup<T extends ColumnCollection>(res: T, colData: ColumnGrouping, collection: T, level = 0): T {
    // group template
    const group: Group = {
      ...colData,
      level,
      ids: [],
    };

    // check columns for update
    for (let k in collection.columns) {
      const key = k as keyof ColumnItems;
      const resultItem = res.columns[key];
      const collectionItem = collection.columns[key];

      // if column data
      if (isArray(resultItem) && isArray(collectionItem)) {
        // fill columns
        resultItem.push(...collectionItem);

        // fill grouping
        if (collectionItem.length) {
          res.columnGrouping[key].push({
            ...group,
            ids: map(collectionItem, 'prop'),
          });
        }
      }
    }
    // merge column groupings
    for (let k in collection.columnGrouping) {
      const key = k as DimensionCols;
      const collectionItem = collection.columnGrouping[key];
      res.columnGrouping[key].push(...collectionItem);
    }
    res.maxLevel = Math.max(res.maxLevel, collection.maxLevel);
    res.sort = { ...res.sort, ...collection.sort };
    return res;
  }
}

/**
 * Check if column is grouping column
 */
export function isColGrouping(colData: ColumnGrouping | ColumnRegular): colData is ColumnGrouping {
  return !!(colData as ColumnGrouping).children;
}
