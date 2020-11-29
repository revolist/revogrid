import reduce from 'lodash/reduce';
import each from 'lodash/each';
import isArray from 'lodash/isArray';
import map from 'lodash/map';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';

import DataStore, {Group as StoreGroup, Groups} from '../store/dataSource/data.store';
import {columnTypes} from '../store/storeTypes';
import { ColumnItems } from './dimension.provider';
import {RevoGrid} from '../interfaces';

interface Group extends StoreGroup {
    level: number;
};
type ColumnGrouping = Record<RevoGrid.DimensionCols, Group[]>;

export type ColumnCollection = {
    columns: ColumnItems;
    columnGrouping: ColumnGrouping;
    maxLevel: number;
    sort: Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>;
};

type ColumnDataSources = Record<RevoGrid.DimensionCols, DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
type Sorting = Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>;
type SortingOrder = Record<RevoGrid.ColumnProp, 'asc'|'desc'>;

export default class ColumnDataProvider {
    private readonly dataSources: ColumnDataSources;
    sorting: Sorting| null = null;
    
    get order() {
        return reduce(this.sorting, (r: SortingOrder, c, prop) => {
            r[prop] = c.order;
            return r;
        }, {});
    }

    get stores() {
        return this.dataSources;
    }
    constructor() {
        this.dataSources = reduce(columnTypes, (sources: Partial<ColumnDataSources>, k: RevoGrid.DimensionCols) => {
            sources[k] = new DataStore(k);
            return sources;
        }, {}) as ColumnDataSources;
    }

    column(c: number, pin?: RevoGrid.DimensionColPin): RevoGrid.ColumnRegular|undefined {
        return this.getColumn(c, pin || 'col');
    }

    getColumn(c: number, type: RevoGrid.DimensionCols): RevoGrid.ColumnRegular|undefined {
        return this.dataSources[type].store.get('items')[c];
    }
		
    getColumnIndexByProp(prop: RevoGrid.ColumnProp, type: RevoGrid.DimensionCols): number {
        const items = this.dataSources[type].store.get('items');
        return findIndex(items, { prop });
    }

    getColumnByProp(prop: RevoGrid.ColumnProp, type: RevoGrid.DimensionCols): RevoGrid.ColumnRegular|undefined {
        const items = this.dataSources[type].store.get('items');
        return find(items, { prop });
    }

    setColumns(data: ColumnCollection): ColumnCollection {
        each(columnTypes, (k: RevoGrid.DimensionCols) => {
            this.dataSources[k].updateData(data.columns[k], {
                depth: data.maxLevel,
                groups: reduce(data.columnGrouping[k], (res: Groups, g: Group) => {
                    if (!res[g.level]) {
                        res[g.level] = [];
                    }
                    res[g.level].push(g);
                    return res;
                }, {})
            })
        });
        this.sorting = data.sort;
        return data;
    }
		
    updateColumn(column: RevoGrid.ColumnRegular, index: number): void {
        const type = ColumnDataProvider.getColumnType(column);
        const cols = this.dataSources[type].store.get('items');
        cols[index] = column;
        this.dataSources[type].setData({
            items: [...cols]
        });
	}

    updateColumnSorting(column: RevoGrid.ColumnRegular, index: number, sorting: 'asc'|'desc'): RevoGrid.ColumnRegular {
        this.clearSorting();
        column.order = sorting;
        this.sorting[column.prop] = column;
        const type = ColumnDataProvider.getColumnType(column);
        const cols = this.dataSources[type].store.get('items');
        cols[index] = column;
        this.dataSources[type].setData({ items: [...cols] });
        return column;
    }
		
    private clearSorting(): void {
        const types = reduce(this.sorting, (r: {[key in Partial<RevoGrid.DimensionCols>]: boolean}, c: RevoGrid.ColumnRegular) => {
            const k = ColumnDataProvider.getColumnType(c);
            r[k] = true;
            return r;
        }, {} as {[key in Partial<RevoGrid.DimensionCols>]: boolean});
        each(types, (_, type: RevoGrid.DimensionCols) => {
            const cols = this.dataSources[type].store.get('items');
            each(cols, (c: RevoGrid.ColumnRegular) => {
                c.order = undefined;
            });
            this.dataSources[type].setData({
                    items: [...cols]
            });
        });

        this.sorting = {};
    }

    static getSizes(cols: RevoGrid.ColumnRegular[]): RevoGrid.ViewSettingSizeProp {
        return reduce(cols, (res: RevoGrid.ViewSettingSizeProp, c: RevoGrid.ColumnRegular, i: number) => {
            if (c.size) {
                res[i] = c.size;
            }
            return res;
        }, {});

    }

    private static isColGrouping(colData: RevoGrid.ColumnGrouping | RevoGrid.ColumnRegular): colData is RevoGrid.ColumnGrouping {
        return !!(colData as RevoGrid.ColumnGrouping).children;
    }

    static getColumnByProp(columns: RevoGrid.ColumnData, prop: RevoGrid.ColumnProp): RevoGrid.ColumnRegular|undefined {
        return find(columns, c => {
            if (ColumnDataProvider.isColGrouping(c)) {
                return ColumnDataProvider.getColumnByProp(c.children, prop);
            }
            return c.prop === prop;
        }) as (RevoGrid.ColumnRegular|undefined);
    }

    // columns processing
    static getColumns(
        columns: RevoGrid.ColumnData,
        level: number = 0,
        types?: RevoGrid.ColumnTypes
    ): ColumnCollection {
        return reduce(columns, (res: ColumnCollection, colData: RevoGrid.ColumnDataSchema) => {
            /** Grouped column */
            if (ColumnDataProvider.isColGrouping(colData)) {
                return ColumnDataProvider.gatherGroup(res, colData, level, types);
            } 
            /** Regular column */
            const regularColumn = {
                ...(colData.columnType && types && types[colData.columnType]),
                ...colData
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
        }, {
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
        });
    }

    private static gatherGroup(
        res: ColumnCollection,
        colData: RevoGrid.ColumnGrouping,
        level: number = 0,
        types?: RevoGrid.ColumnTypes): ColumnCollection {
        // receive parsed data up to single cell
        const collection: ColumnCollection = ColumnDataProvider.getColumns(colData.children, level + 1, types);

        // group template
        const group: Group = {
          ...colData,
          level,
          ids: []
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
        return res;
    }

    static getColumnType(col: RevoGrid.ColumnRegular): RevoGrid.DimensionCols {
        if (col.pin) {
            return col.pin;
        }
        return 'col';
    }
}

