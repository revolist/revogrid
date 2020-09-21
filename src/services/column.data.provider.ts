import reduce from 'lodash/reduce';
import each from 'lodash/each';
import isArray from 'lodash/isArray';
import map from 'lodash/map';

import DataStore, {Groups} from '../store/dataSource/data.store';
import {columnTypes} from '../store/storeTypes';
import DimensionProvider from './dimension.provider';
import {RevoGrid} from '../interfaces';
import DimensionColPin = RevoGrid.DimensionColPin;

type Group = {
    name: string;
    level: number;
    props: RevoGrid.ColumnProp[];
};
type ColumnGrouping = {
    [T in RevoGrid.DimensionCols]: Group[];
};
type Columns = {
    sizes: RevoGrid.ViewSettingSizeProp;
} & {[T in RevoGrid.DimensionCols]: RevoGrid.ColumnRegular[];};
type ColumnCollection = {
    columns: Columns;
    columnGrouping: ColumnGrouping;
    maxLevel: number;
};

type ColumnDataSources = {[T in RevoGrid.DimensionCols]: DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>};

export default class ColumnDataProvider {
    private readonly dataSources: ColumnDataSources;
    get stores(): ColumnDataSources {
        return this.dataSources;
    }
    constructor(private dimensionProvider: DimensionProvider) {
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

    setColumns(columns: RevoGrid.ColumnData): void {
        const data: ColumnCollection = ColumnDataProvider.getColumns(columns);
        each(columnTypes, (k: RevoGrid.DimensionCols) => {
            this.dataSources[k].updateData(data.columns[k], {
                depth: data.maxLevel,
                groups: reduce(data.columnGrouping[k], (res: Groups, g: Group) => {
                    if (!res[g.level]) {
                        res[g.level] = [];
                    }
                    res[g.level].push({
                      name: g.name,
                      ids: g.props
                    });
                    return res;
                }, {})
            })
        });
        this.dimensionProvider.setMainArea('col', data.columns);
        for (let p of ['colPinStart', 'colPinEnd']) {
            let pin: DimensionColPin = p as DimensionColPin;
            this.dimensionProvider.setPins(data.columns[pin], pin, ColumnDataProvider.getPinSizes(data.columns[pin]));
        }
    }

    updateColumn(column: RevoGrid.ColumnRegular, index: number): void {
        const type: RevoGrid.DimensionCols = column.pin || 'col';
        const cols = this.dataSources[type].store.get('items');
        cols[index] = column;
        this.dataSources[type].setData({
            items: [...cols]
        });
    }

    private static getPinSizes(cols: RevoGrid.ColumnRegular[]): RevoGrid.ViewSettingSizeProp {
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

    // columns processing
    private static getColumns(columns: RevoGrid.ColumnData, level: number = 0): ColumnCollection {
        return reduce(columns, (res: ColumnCollection, colData: RevoGrid.ColumnDataSchema) => {
            // if grouped column
            if (ColumnDataProvider.isColGrouping(colData)) {
                // receive parsed data up to single cell
                const collection: ColumnCollection = ColumnDataProvider.getColumns(colData.children, level + 1);

                // group template
                const group: Group = {
                  name: colData.name,
                  level,
                  props: []
                };

                // check columns for update
                for (let k in collection.columns) {
                    const key = k as keyof Columns;
                    const resultItem = res.columns[key];
                    const collectionItem = collection.columns[key];

                    // if column data
                    if (isArray(resultItem) && isArray(collectionItem)) {
                        // fill columns
                        resultItem.push(...collectionItem);

                        // fill grouping
                        if (key !== 'sizes' && collectionItem.length) {
                            res.columnGrouping[key].push({
                                ...group,
                                props: map(collectionItem, 'prop')
                            });
                        }
                    } else {
                        // fill sizes
                        (res.columns[key] as RevoGrid.ViewSettingSizeProp) = {...resultItem, ...collectionItem} as RevoGrid.ViewSettingSizeProp;
                    }
                }
                // merge column groupings
                for (let k in collection.columnGrouping) {
                    const key = k as RevoGrid.DimensionCols;
                    const collectionItem = collection.columnGrouping[key];
                    res.columnGrouping[key].push(...collectionItem);
                }
                res.maxLevel = Math.max(res.maxLevel, collection.maxLevel);
            } else {
                if (!colData.pin) {
                    res.columns.col.push(colData);
                    if (colData.size) {
                        res.columns.sizes[res.columns.col.length - 1] = colData.size;
                    }
                } else {
                    res.columns[colData.pin].push(colData);
                }
            }
            return res;
        }, {
            columns: {
                col: [],
                colPinStart: [],
                colPinEnd: [],
                sizes: {}
            },
            columnGrouping: {
                col: [],
                colPinStart: [],
                colPinEnd: []
            },
            maxLevel: level
        });
    }
}

