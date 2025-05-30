import reduce from 'lodash/reduce';
import {
  columnTypes,
  DataStore,
  getSourceItem,
  getSourceItemVirtualIndexByProp,
  Groups,
  setSourceByPhysicalIndex,
  setSourceByVirtualIndex,
} from '@store';
import type {
  ColumnProp,
  ColumnRegular,
  DimensionCols,
} from '@type';
import { ColumnCollection, getColumnType } from '../utils/column.utils';

export type ColumnDataSources = Record<
  DimensionCols,
  DataStore<ColumnRegular, DimensionCols>
>;

export default class ColumnDataProvider {
  readonly dataSources: ColumnDataSources;
  collection: ColumnCollection | null = null;

  get stores() {
    return this.dataSources;
  }
  constructor() {
    this.dataSources = columnTypes.reduce(
      (sources: ColumnDataSources, k: DimensionCols) => {
        sources[k] = new DataStore(k);
        return sources;
      },
      {} as ColumnDataSources,
    );
  }

  column(c: number, type: DimensionCols = 'rgCol'): ColumnRegular | undefined {
    return this.getColumn(c, type);
  }

  getColumn(
    virtualIndex: number,
    type: DimensionCols,
  ): ColumnRegular | undefined {
    return getSourceItem(this.dataSources[type].store, virtualIndex);
  }

  getRawColumns(): Record<DimensionCols, ColumnRegular[]> {
    return reduce(
      this.dataSources,
      (
        result: Record<DimensionCols, ColumnRegular[]>,
        item,
        type: DimensionCols,
      ) => {
        result[type] = item.store.get('source');
        return result;
      },
      {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
    );
  }

  getColumns(type: DimensionCols | 'all' = 'all'): ColumnRegular[] {
    const columnsByType = this.getRawColumns();
    if (type !== 'all') {
      return columnsByType[type];
    }
    return columnTypes.reduce((r: ColumnRegular[], t) => [...r, ...columnsByType[t]], []);
  }

  getColumnIndexByProp(prop: ColumnProp, type: DimensionCols): number {
    return getSourceItemVirtualIndexByProp(this.dataSources[type].store, prop);
  }

  getColumnByProp(prop: ColumnProp) {
    return this.collection?.columnByProp[prop];
  }

  refreshByType(type: DimensionCols) {
    this.dataSources[type].refresh();
  }

  /**
   * Main method to set columns
   */
  setColumns(data: ColumnCollection): ColumnCollection {
    columnTypes.forEach(k => {
      // set columns data
      this.dataSources[k].updateData(data.columns[k], {
        // max depth level
        depth: data.maxLevel,

        // groups
        groups: data.columnGrouping[k].reduce((res: Groups, g) => {
          if (!res[g.level]) {
            res[g.level] = [];
          }
          res[g.level].push(g);
          return res;
        }, {}),
      });
    });
    this.collection = data;
    return data;
  }

  /**
   * Used in plugins
   * Modify columns in store
   */
  updateColumns(updatedColumns: ColumnRegular[]) {
    // collect column by type and propert
    const columnByKey = updatedColumns.reduce(
      (
        res: Partial<Record<DimensionCols, Record<ColumnProp, ColumnRegular>>>,
        c,
      ) => {
        const type = getColumnType(c);
        if (!res[type]) {
          res[type] = {};
        }
        res[type][c.prop] = c;
        return res;
      },
      {},
    );

    // find indexes in source
    const colByIndex: Partial<
      Record<DimensionCols, Record<number, ColumnRegular>>
    > = {};
    for (const t in columnByKey) {
      if (!columnByKey.hasOwnProperty(t)) {
        continue;
      }
      const type = t as DimensionCols;
      const colsToUpdate = columnByKey[type];
      const sourceItems = this.dataSources[type].store.get('source');
      colByIndex[type] = {};
      for (let i = 0; i < sourceItems.length; i++) {
        const column = sourceItems[i];
        const colToUpdateIfExists = colsToUpdate?.[column.prop];

        // update column if exists in source
        if (colToUpdateIfExists) {
          colByIndex[type][i] = colToUpdateIfExists;
        }
      }
    }
    for (const t in colByIndex) {
      if (!colByIndex.hasOwnProperty(t)) {
        continue;
      }
      const type = t as DimensionCols;
      setSourceByPhysicalIndex(
        this.dataSources[type].store,
        colByIndex[type] || {},
      );
    }
  }

  updateColumn(column: ColumnRegular, index: number) {
    const type = getColumnType(column);
    setSourceByVirtualIndex(this.dataSources[type].store, { [index]: column });
  }
}
