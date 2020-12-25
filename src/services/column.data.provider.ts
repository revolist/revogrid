import reduce from 'lodash/reduce';
import each from 'lodash/each';
import isArray from 'lodash/isArray';
import map from 'lodash/map';
import find from 'lodash/find';

import DataStore, {getSourceItem, getSourceItemVirtualIndexByProp, Group as StoreGroup, Groups, setSourceItem} from '../store/dataSource/data.store';
import {columnTypes} from '../store/storeTypes';
import { ColumnItems } from './dimension.provider';
import {RevoGrid} from '../interfaces';
import ColumnRegular = RevoGrid.ColumnRegular;
import DimensionCols = RevoGrid.DimensionCols;

interface Group extends StoreGroup {
    level: number;
};
type ColumnGrouping = Record<DimensionCols, Group[]>;

export type ColumnCollection = {
    columns: ColumnItems;
    columnGrouping: ColumnGrouping;
    maxLevel: number;
    sort: Record<RevoGrid.ColumnProp, ColumnRegular>;
};

type ColumnDataSources = Record<DimensionCols, DataStore<ColumnRegular, DimensionCols>>;
type Sorting = Record<RevoGrid.ColumnProp, ColumnRegular>;
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
        this.dataSources = reduce(columnTypes, (sources: Partial<ColumnDataSources>, k: DimensionCols) => {
            sources[k] = new DataStore(k);
            return sources;
        }, {}) as ColumnDataSources;
    }

    column(c: number, pin?: RevoGrid.DimensionColPin): ColumnRegular|undefined {
        return this.getColumn(c, pin || 'col');
    }

    getColumn(virtualIndex: number, type: DimensionCols): ColumnRegular|undefined {
        return getSourceItem(this.dataSources[type].store, virtualIndex);
    }
		
    getColumnIndexByProp(prop: RevoGrid.ColumnProp, type: DimensionCols): number {
        return getSourceItemVirtualIndexByProp(this.dataSources[type].store, prop);
    }

    getColumnByProp(prop: RevoGrid.ColumnProp, type: DimensionCols): ColumnRegular|undefined {
        const items = this.dataSources[type].store.get('source');
        return find(items, { prop });
    }

    setColumns(data: ColumnCollection): ColumnCollection {
        each(columnTypes, (k: DimensionCols) => {
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
		
    updateColumn(column: ColumnRegular, index: number): void {
        const type = ColumnDataProvider.getColumnType(column);
        setSourceItem(this.dataSources[type].store, {[index]: column});
	}

    updateColumnSorting(column: ColumnRegular, index: number, sorting: 'asc'|'desc'): ColumnRegular {
        this.clearSorting();
        column.order = sorting;
        this.sorting[column.prop] = column;
        this.updateColumn(column, index);
        return column;
    }
		
    private clearSorting(): void {
        const types = reduce(this.sorting, (r: {[key in Partial<DimensionCols>]: boolean}, c: ColumnRegular) => {
            const k = ColumnDataProvider.getColumnType(c);
            r[k] = true;
            return r;
        }, {} as {[key in Partial<DimensionCols>]: boolean});
        each(types, (_, type: DimensionCols) => {
            const cols = this.dataSources[type].store.get('source');
            each(cols, (c: ColumnRegular) => (c.order = undefined));
            this.dataSources[type].setData({ source: [...cols] });
        });

        this.sorting = {};
    }

    static getSizes(cols: ColumnRegular[]): RevoGrid.ViewSettingSizeProp {
        return reduce(cols, (res: RevoGrid.ViewSettingSizeProp, c: ColumnRegular, i: number) => {
            if (c.size) {
                res[i] = c.size;
            }
            return res;
        }, {});

    }

    private static isColGrouping(colData: RevoGrid.ColumnGrouping | ColumnRegular): colData is RevoGrid.ColumnGrouping {
        return !!(colData as RevoGrid.ColumnGrouping).children;
    }

    static getColumnByProp(columns: RevoGrid.ColumnData, prop: RevoGrid.ColumnProp): ColumnRegular|undefined {
        return find(columns, c => {
            if (ColumnDataProvider.isColGrouping(c)) {
                return ColumnDataProvider.getColumnByProp(c.children, prop);
            }
            return c.prop === prop;
        }) as (ColumnRegular|undefined);
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
            const key = k as DimensionCols;
            const collectionItem = collection.columnGrouping[key];
            res.columnGrouping[key].push(...collectionItem);
        }
        res.maxLevel = Math.max(res.maxLevel, collection.maxLevel);
        return res;
    }

    static getColumnType(col: ColumnRegular): DimensionCols {
        if (col.pin) {
            return col.pin;
        }
        return 'col';
    }
}

