import reduce from 'lodash/reduce';
import each from 'lodash/each';
import find from 'lodash/find';

import {
  columnTypes,
  DataStore,
  getSourceItem,
  getSourceItemVirtualIndexByProp,
  Groups,
  setSourceByVirtualIndex,
} from '@store';
import type {
  ColumnProp,
  ColumnRegular,
  DimensionCols,
  DimensionColPin,
} from '@type';
import { ColumnCollection, getColumnType } from '../utils/column.utils';


export type ColumnDataSources = Record<
  DimensionCols,
  DataStore<ColumnRegular, DimensionCols>
>;
type Sorting = Record<ColumnProp, ColumnRegular>;
type SortingOrder = Record<ColumnProp, 'asc' | 'desc' | undefined>;

export default class ColumnDataProvider {
  readonly dataSources: ColumnDataSources;
  sorting: Sorting | null = null;

  get order() {
    const order: SortingOrder = {};
    const sorting = this.sorting;
    if (sorting) {
      Object.keys(sorting).forEach((prop) => {
        order[prop] = sorting[prop].order;
      });
    }
    return order;
  }

  get stores() {
    return this.dataSources;
  }
  constructor() {
    this.dataSources = columnTypes.reduce((sources: ColumnDataSources, k: DimensionCols) => {
      sources[k] = new DataStore(k);
      return sources;
    }, {} as ColumnDataSources);
  }

  column(c: number, pin?: DimensionColPin): ColumnRegular | undefined {
    return this.getColumn(c, pin || 'rgCol');
  }

  getColumn(
    virtualIndex: number,
    type: DimensionCols,
  ): ColumnRegular | undefined {
    return getSourceItem(this.dataSources[type].store, virtualIndex);
  }

  getRawColumns() {
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
    if (type !== 'all') {
      return this.dataSources[type].store.get('source');
    }
    return columnTypes.reduce((r: ColumnRegular[], t) => {
      r.push(...this.dataSources[t].store.get('source'));
      return r;
    }, []);
  }

  getColumnIndexByProp(prop: ColumnProp, type: DimensionCols): number {
    return getSourceItemVirtualIndexByProp(this.dataSources[type].store, prop);
  }

  getColumnByProp(
    prop: ColumnProp,
    type: DimensionCols,
  ): ColumnRegular | undefined {
    const items = this.dataSources[type].store.get('source');
    return find(items, { prop });
  }

  refreshByType(type: DimensionCols) {
    this.dataSources[type].refresh();
  }

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
    this.sorting = data.sort;
    return data;
  }

  updateColumns(cols: ColumnRegular[]) {
    // collect column by type and propert
    const columnByKey: Partial<
      Record<DimensionCols, Record<ColumnProp, ColumnRegular>>
    > = cols.reduce(
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
      const items = this.dataSources[type].store.get('source');
      colByIndex[type] = {};
      for (let i = 0; i < items.length; i++) {
        const rgCol = items[i];
        const colToUpdateIfExists = colsToUpdate?.[rgCol.prop];
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
      setSourceByVirtualIndex(
        this.dataSources[type].store,
        colByIndex[type] || {},
      );
    }
  }

  updateColumn(column: ColumnRegular, index: number) {
    const type = getColumnType(column);
    setSourceByVirtualIndex(this.dataSources[type].store, { [index]: column });
  }

  updateColumnSorting(
    column: ColumnRegular,
    index: number,
    sorting: 'asc' | 'desc' | undefined,
    additive: boolean,
  ): ColumnRegular {
    if (!additive) {
      this.clearSorting();
    }
    column.order = sorting;
    if (!this.sorting) {
      this.sorting = {};
    }
    this.sorting[column.prop] = column;
    this.updateColumn(column, index);
    return column;
  }

  clearSorting() {
    const types = reduce(
      this.sorting,
      (r: { [key in Partial<DimensionCols>]: boolean }, c: ColumnRegular) => {
        const k = getColumnType(c);
        r[k] = true;
        return r;
      },
      {} as { [key in Partial<DimensionCols>]: boolean },
    );
    each(types, (_, type: DimensionCols) => {
      const cols = this.dataSources[type].store.get('source');
      each(cols, (c: ColumnRegular) => (c.order = undefined));
      this.dataSources[type].setData({ source: [...cols] });
    });

    this.sorting = {};
  }
}
