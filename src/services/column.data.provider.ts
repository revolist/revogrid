import reduce from 'lodash/reduce';
import each from 'lodash/each';
import find from 'lodash/find';

import DataStore, { getSourceItem, getSourceItemVirtualIndexByProp, Groups, setSourceByVirtualIndex } from '../store/dataSource/data.store';
import { columnTypes } from '../store/storeTypes';
import { ColumnItems } from './dimension.provider';
import { RevoGrid } from '../interfaces';
import GroupingColumnPlugin, { ColumnGrouping, isColGrouping } from '../plugins/groupingColumn/grouping.col.plugin';

export type ColumnCollection = {
  columns: ColumnItems;
  columnGrouping: ColumnGrouping;
  maxLevel: number;
  sort: Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>;
};

export type ColumnDataSources = Record<RevoGrid.DimensionCols, DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
type Sorting = Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>;
type SortingOrder = Record<RevoGrid.ColumnProp, 'asc' | 'desc'>;

export default class ColumnDataProvider {
  readonly dataSources: ColumnDataSources;
  sorting: Sorting | null = null;

  get order() {
    return reduce(
      this.sorting,
      (r: SortingOrder, c, prop) => {
        r[prop] = c.order;
        return r;
      },
      {},
    );
  }

  get stores() {
    return this.dataSources;
  }
  constructor() {
    this.dataSources = reduce(
      columnTypes,
      (sources: Partial<ColumnDataSources>, k: RevoGrid.DimensionCols) => {
        sources[k] = new DataStore(k);
        return sources;
      },
      {},
    ) as ColumnDataSources;
  }

  column(c: number, pin?: RevoGrid.DimensionColPin): RevoGrid.ColumnRegular | undefined {
    return this.getColumn(c, pin || 'rgCol');
  }

  getColumn(virtualIndex: number, type: RevoGrid.DimensionCols): RevoGrid.ColumnRegular | undefined {
    return getSourceItem(this.dataSources[type].store, virtualIndex);
  }

  getRawColumns() {
    return reduce(
      this.dataSources,
      (result: ColumnItems, item, type: RevoGrid.DimensionCols) => {
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

  getColumns(type: RevoGrid.DimensionCols | 'all' = 'all') {
    if (type !== 'all') {
      return this.dataSources[type].store.get('source');
    }
    return columnTypes.reduce((r: RevoGrid.ColumnRegular[], t) => {
      r.push(...this.dataSources[t].store.get('source'));
      return r;
    }, []);
  }

  getColumnIndexByProp(prop: RevoGrid.ColumnProp, type: RevoGrid.DimensionCols): number {
    return getSourceItemVirtualIndexByProp(this.dataSources[type].store, prop);
  }

  getColumnByProp(prop: RevoGrid.ColumnProp, type: RevoGrid.DimensionCols): RevoGrid.ColumnRegular | undefined {
    const items = this.dataSources[type].store.get('source');
    return find(items, { prop });
  }

  refreshByType(type: RevoGrid.DimensionCols) {
    this.dataSources[type].refresh();
  }

  setColumns(data: ColumnCollection): ColumnCollection {
    each(columnTypes, k => {
      // set columns data
      this.dataSources[k].updateData(data.columns[k], {
        // max depth level
        depth: data.maxLevel,

        // groups
        groups: reduce(
          data.columnGrouping[k],
          (res: Groups, g) => {
            if (!res[g.level]) {
              res[g.level] = [];
            }
            res[g.level].push(g);
            return res;
          },
          {},
        ),
      });
    });
    this.sorting = data.sort;
    return data;
  }

  updateColumns(cols: RevoGrid.ColumnRegular[]) {
    // collect column by type and propert
    const columnByKey: Partial<Record<RevoGrid.DimensionCols, Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>>> = cols.reduce(
      (res: Partial<Record<RevoGrid.DimensionCols, Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>>>, c) => {
        const type = ColumnDataProvider.getColumnType(c);
        if (!res[type]) {
          res[type] = {};
        }
        res[type][c.prop] = c;
        return res;
      },
      {},
    );

    // find indexes in source
    const colByIndex: Partial<Record<RevoGrid.DimensionCols, Record<number, RevoGrid.ColumnRegular>>> = {};
    each(columnByKey, (colsToUpdate, type: RevoGrid.DimensionCols) => {
      const items = this.dataSources[type].store.get('source');
      colByIndex[type] = items.reduce((result: Record<number, RevoGrid.ColumnRegular>, rgCol, index) => {
        const colToUpdateIfExists = colsToUpdate[rgCol.prop];
        if (colToUpdateIfExists) {
          result[index] = colToUpdateIfExists;
        }
        return result;
      }, {});
    });
    each(colByIndex, (colsToUpdate, type: RevoGrid.DimensionCols) => setSourceByVirtualIndex(this.dataSources[type].store, colsToUpdate));
  }

  updateColumn(column: RevoGrid.ColumnRegular, index: number) {
    const type = ColumnDataProvider.getColumnType(column);
    setSourceByVirtualIndex(this.dataSources[type].store, { [index]: column });
  }

  updateColumnSorting(column: RevoGrid.ColumnRegular, index: number, sorting: 'asc' | 'desc', additive: boolean): RevoGrid.ColumnRegular {
    if (!additive) {
      this.clearSorting();
    }
    column.order = sorting;
    this.sorting[column.prop] = column;
    this.updateColumn(column, index);
    return column;
  }

  clearSorting(): void {
    const types = reduce(
      this.sorting,
      (r: { [key in Partial<RevoGrid.DimensionCols>]: boolean }, c: RevoGrid.ColumnRegular) => {
        const k = ColumnDataProvider.getColumnType(c);
        r[k] = true;
        return r;
      },
      {} as { [key in Partial<RevoGrid.DimensionCols>]: boolean },
    );
    each(types, (_, type: RevoGrid.DimensionCols) => {
      const cols = this.dataSources[type].store.get('source');
      each(cols, (c: RevoGrid.ColumnRegular) => (c.order = undefined));
      this.dataSources[type].setData({ source: [...cols] });
    });

    this.sorting = {};
  }

  static getSizes(cols: RevoGrid.ColumnRegular[]): RevoGrid.ViewSettingSizeProp {
    return reduce(
      cols,
      (res: RevoGrid.ViewSettingSizeProp, c: RevoGrid.ColumnRegular, i: number) => {
        if (c.size) {
          res[i] = c.size;
        }
        return res;
      },
      {},
    );
  }

  static getColumnByProp(columns: RevoGrid.ColumnData, prop: RevoGrid.ColumnProp): RevoGrid.ColumnRegular | undefined {
    return find(columns, c => {
      if (isColGrouping(c)) {
        return ColumnDataProvider.getColumnByProp(c.children, prop);
      }
      return c.prop === prop;
    }) as RevoGrid.ColumnRegular | undefined;
  }

  // columns processing
  static getColumns(columns: RevoGrid.ColumnData, level = 0, types?: RevoGrid.ColumnTypes): ColumnCollection {
    const collection: ColumnCollection = {
      columns: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      columnGrouping: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      maxLevel: level,
      sort: {},
    };
    return reduce(
      columns,
      (res: ColumnCollection, colData: RevoGrid.ColumnDataSchema) => {
        // Grouped column
        if (isColGrouping(colData)) {
          return GroupingColumnPlugin.gatherGroup(res, colData, ColumnDataProvider.getColumns(colData.children, level + 1, types), level);
        }
        // Regular column
        const regularColumn = {
          ...(colData.columnType && types && types[colData.columnType]),
          ...colData,
        };
        // Regular column, no Pin
        if (!regularColumn.pin) {
          res.columns.rgCol.push(regularColumn);
          // Pin
        } else {
          res.columns[regularColumn.pin].push(regularColumn);
        }
        if (regularColumn.order) {
          res.sort[regularColumn.prop] = regularColumn;
        }

        // trigger setup hook if present
        regularColumn.beforeSetup && regularColumn.beforeSetup(regularColumn);
        return res;
      },
      collection,
    );
  }

  static getColumnType(rgCol: RevoGrid.ColumnRegular): RevoGrid.DimensionCols {
    if (rgCol.pin) {
      return rgCol.pin;
    }
    return 'rgCol';
  }
}
