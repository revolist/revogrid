import isArray from 'lodash/isArray';
import map from 'lodash/map';
import { RevoGrid } from '../../interfaces';
import { ColumnCollection } from '../../services/column.data.provider';
import { ColumnItems } from '../../services/dimension.provider';
import { Group as StoreGroup } from '../../store/dataSource/data.store';
import BasePlugin from '../basePlugin';
interface Group extends StoreGroup {
  level: number;
}
export type ColumnGrouping = Record<RevoGrid.DimensionCols, Group[]>;

export default class GroupingColumnPlugin extends BasePlugin {
  static gatherGroup<T extends ColumnCollection>(res: T, colData: RevoGrid.ColumnGrouping, collection: T, level = 0): T {
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
      const key = k as RevoGrid.DimensionCols;
      const collectionItem = collection.columnGrouping[key];
      res.columnGrouping[key].push(...collectionItem);
    }
    res.maxLevel = Math.max(res.maxLevel, collection.maxLevel);
    res.sort = { ...res.sort, ...collection.sort };
    return res;
  }
}
export function isColGrouping(colData: RevoGrid.ColumnGrouping | RevoGrid.ColumnRegular): colData is RevoGrid.ColumnGrouping {
  return !!(colData as RevoGrid.ColumnGrouping).children;
}
