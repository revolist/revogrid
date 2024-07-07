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
import GroupingColumnPlugin, {
  ColumnGroupingCollection,
  isColGrouping,
} from '../plugins/groupingColumn/grouping.col.plugin';
import {
  ColumnData,
  ColumnProp,
  ColumnRegular,
  ColumnTypes,
  ViewSettingSizeProp,
  DimensionCols,
  DimensionColPin,
  ColumnGrouping,
} from '@type';

export type ColumnCollection = {
  columns: Record<DimensionCols, ColumnRegular[]>;
  columnByProp: Record<ColumnProp, ColumnRegular[]>;
  columnGrouping: ColumnGroupingCollection;
  maxLevel: number;
  sort: Record<ColumnProp, ColumnRegular>;
};

export type ColumnDataSources = Record<
  DimensionCols,
  DataStore<ColumnRegular, DimensionCols>
>;
type Sorting = Record<ColumnProp, ColumnRegular>;
type SortingOrder = Record<ColumnProp, 'asc' | 'desc'>;

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
      (sources: Partial<ColumnDataSources>, k: DimensionCols) => {
        sources[k] = new DataStore(k);
        return sources;
      },
      {},
    ) as ColumnDataSources;
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
    const colByIndex: Partial<
      Record<DimensionCols, Record<number, ColumnRegular>>
    > = {};
    each(columnByKey, (colsToUpdate, type: DimensionCols) => {
      const items = this.dataSources[type].store.get('source');
      colByIndex[type] = items.reduce(
        (result: Record<number, ColumnRegular>, rgCol, index) => {
          const colToUpdateIfExists = colsToUpdate[rgCol.prop];
          if (colToUpdateIfExists) {
            result[index] = colToUpdateIfExists;
          }
          return result;
        },
        {},
      );
    });
    each(colByIndex, (colsToUpdate, type: DimensionCols) =>
      setSourceByVirtualIndex(this.dataSources[type].store, colsToUpdate),
    );
  }

  updateColumn(column: ColumnRegular, index: number) {
    const type = ColumnDataProvider.getColumnType(column);
    setSourceByVirtualIndex(this.dataSources[type].store, { [index]: column });
  }

  updateColumnSorting(
    column: ColumnRegular,
    index: number,
    sorting: 'asc' | 'desc',
    additive: boolean,
  ): ColumnRegular {
    if (!additive) {
      this.clearSorting();
    }
    column.order = sorting;
    this.sorting[column.prop] = column;
    this.updateColumn(column, index);
    return column;
  }

  clearSorting() {
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

  static getSizes(cols: ColumnRegular[]): ViewSettingSizeProp {
    return reduce(
      cols,
      (res: ViewSettingSizeProp, c: ColumnRegular, i: number) => {
        if (c.size) {
          res[i] = c.size;
        }
        return res;
      },
      {},
    );
  }

  static getColumnByProp(
    columns: ColumnData,
    prop: ColumnProp,
  ): ColumnRegular | undefined {
    return find(columns, c => {
      if (isColGrouping(c)) {
        return ColumnDataProvider.getColumnByProp(c.children, prop);
      }
      return c.prop === prop;
    }) as ColumnRegular | undefined;
  }

  // columns processing
  static getColumns(
    columns: ColumnData,
    level = 0,
    types?: ColumnTypes,
  ): ColumnCollection {
    const collection: ColumnCollection = {
      // columns as they are in stores per type
      columns: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      // columns grouped by prop for quick access
      columnByProp: {},
      // column grouping
      columnGrouping: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      // max depth level for column grouping
      maxLevel: level,
      // sorting
      sort: {},
    };

    return reduce(
      columns,
      (res: ColumnCollection, colData: ColumnGrouping | ColumnRegular) => {
        // Grouped column
        if (isColGrouping(colData)) {
          return GroupingColumnPlugin.gatherGroup(
            res,
            colData,
            ColumnDataProvider.getColumns(colData.children, level + 1, types),
            level,
          );
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
        // technically it's possible that some columns have same prop, but better to avoid it
        if (!res.columnByProp[regularColumn.prop]) {
          res.columnByProp[regularColumn.prop] = [];
        }
        res.columnByProp[regularColumn.prop].push(regularColumn);

        // trigger setup hook if present
        regularColumn.beforeSetup && regularColumn.beforeSetup(regularColumn);
        return res;
      },
      collection,
    );
  }

  static getColumnType(rgCol: ColumnRegular): DimensionCols {
    if (rgCol.pin) {
      return rgCol.pin;
    }
    return 'rgCol';
  }
}
