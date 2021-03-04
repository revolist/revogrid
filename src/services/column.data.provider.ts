import reduce from 'lodash/reduce';
import each from 'lodash/each';
import find from 'lodash/find';

import DataStore, { getSourceItem, getSourceItemVirtualIndexByProp, Groups, setSourceByVirtualIndex } from '../store/dataSource/data.store';
import { columnTypes } from '../store/storeTypes';
import { ColumnItems } from './dimension.provider';
import { RevoGrid } from '../interfaces';
import ColumnRegular = RevoGrid.ColumnRegular;
import DimensionCols = RevoGrid.DimensionCols;
import ColumnProp = RevoGrid.ColumnProp;
import GroupingColumnPlugin, { ColumnGrouping } from '../plugins/groupingColumn/grouping.col.plugin';

export type ColumnCollection = {
  columns: ColumnItems;
  columnGrouping: ColumnGrouping;
  maxLevel: number;
  sort: Record<ColumnProp, ColumnRegular>;
};

export type ColumnDataSources = Record<DimensionCols, DataStore<ColumnRegular, DimensionCols>>;
type Sorting = Record<ColumnProp, ColumnRegular>;
type SortingOrder = Record<ColumnProp, 'asc' | 'desc'>;

export default class ColumnDataProvider {
  private readonly dataSources: ColumnDataSources;
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
      (sources: Partial<ColumnDataSources>, k: DimensionCols) => {
        sources[k] = new DataStore(k);
        return sources;
      },
      {},
    ) as ColumnDataSources;
  }

  column(c: number, pin?: RevoGrid.DimensionColPin): ColumnRegular | undefined {
    return this.getColumn(c, pin || 'col');
  }

  getColumn(virtualIndex: number, type: DimensionCols): ColumnRegular | undefined {
    return getSourceItem(this.dataSources[type].store, virtualIndex);
  }

  getColumns(type: DimensionCols | 'all' = 'all') {
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

  getColumnByProp(prop: ColumnProp, type: DimensionCols): ColumnRegular | undefined {
    const items = this.dataSources[type].store.get('source');
    return find(items, { prop });
  }

  refreshByType(type: DimensionCols) {
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

  updateColumns(cols: ColumnRegular[]) {
    // collect column by type and propert
    const columnByKey: Partial<Record<DimensionCols, Record<ColumnProp, ColumnRegular>>> = cols.reduce(
      (res: Partial<Record<DimensionCols, Record<ColumnProp, ColumnRegular>>>, c) => {
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
    const colByIndex: Partial<Record<DimensionCols, Record<number, ColumnRegular>>> = {};
    each(columnByKey, (colsToUpdate, type: DimensionCols) => {
      const items = this.dataSources[type].store.get('source');
      colByIndex[type] = items.reduce((result: Record<number, ColumnRegular>, col, index) => {
        const colToUpdateIfExists = colsToUpdate[col.pro];
        if (colToUpdateIfExists) {
          result[index] = colToUpdateIfExists;
        }
        return result;
      }, {});
    });
    each(colByIndex, (colsToUpdate, type: DimensionCols) => setSourceByVirtualIndex(this.dataSources[type].store, colsToUpdate));
  }

  updateColumn(column: ColumnRegular, index: number) {
    const type = ColumnDataProvider.getColumnType(column);
    setSourceByVirtualIndex(this.dataSources[type].store, { [index]: column });
  }

  updateColumnSorting(column: ColumnRegular, index: number, sorting: 'asc' | 'desc'): ColumnRegular {
    this.clearSorting();
    column.order = sorting;
    this.sorting[column.prop] = column;
    this.updateColumn(column, index);
    return column;
  }

  private clearSorting(): void {
    const types = reduce(
      this.sorting,
      (r: { [key in Partial<DimensionCols>]: boolean }, c: ColumnRegular) => {
        const k = ColumnDataProvider.getColumnType(c);
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

  static getSizes(cols: ColumnRegular[]): RevoGrid.ViewSettingSizeProp {
    return reduce(
      cols,
      (res: RevoGrid.ViewSettingSizeProp, c: ColumnRegular, i: number) => {
        if (c.size) {
          res[i] = c.size;
        }
        return res;
      },
      {},
    );
  }

  static getColumnByProp(columns: RevoGrid.ColumnData, prop: ColumnProp): ColumnRegular | undefined {
    return find(columns, c => {
      if (GroupingColumnPlugin.isColGrouping(c)) {
        return ColumnDataProvider.getColumnByProp(c.children, prop);
      }
      return c.prop === prop;
    }) as ColumnRegular | undefined;
  }

  // columns processing
  static getColumns(columns: RevoGrid.ColumnData, level: number = 0, types?: RevoGrid.ColumnTypes): ColumnCollection {
    return reduce(
      columns,
      (res: ColumnCollection, colData: RevoGrid.ColumnDataSchema) => {
        /** Grouped column */
        if (GroupingColumnPlugin.isColGrouping(colData)) {
          return GroupingColumnPlugin.gatherGroup(res, colData, ColumnDataProvider.getColumns(colData.children, level + 1, types), level);
        }
        /** Regular column */
        const regularColumn = {
          ...(colData.columnType && types && types[colData.columnType]),
          ...colData,
        };
        // not pin
        if (!regularColumn.pin) {
          res.columns.col.push(regularColumn);
          // pin
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
      {
        columns: {
          col: [],
          colPinStart: [],
          colPinEnd: [],
        },
        columnGrouping: {
          col: [],
          colPinStart: [],
          colPinEnd: [],
        },
        maxLevel: level,
        sort: {},
      },
    );
  }

  static getColumnType(col: ColumnRegular): DimensionCols {
    if (col.pin) {
      return col.pin;
    }
    return 'col';
  }
}
