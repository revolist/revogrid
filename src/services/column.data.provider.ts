import reduce from 'lodash/reduce';
import each from 'lodash/each';

import DataStore from "../store/dataSource/data.store";
import {columnTypes} from "../store/storeTypes";
import DimensionProvider from "./dimension.provider";
import {RevoGrid} from "../interfaces";

type ColumnCollection = {
    sizes: RevoGrid.ViewSettingSizeProp;
} & {[T in RevoGrid.DimensionCols]: RevoGrid.ColumnDataSchemaRegular[];};

type ColumnDataSources = {[T in RevoGrid.DimensionCols]: DataStore<RevoGrid.ColumnDataSchemaRegular>};

export default class ColumnDataProvider {
    private readonly dataSources: ColumnDataSources;
    get stores(): ColumnDataSources {
        return this.dataSources;
    }
    constructor(private dimensionProvider: DimensionProvider) {
        this.dataSources = reduce(columnTypes, (sources: Partial<ColumnDataSources>, k: RevoGrid.DimensionCols) => {
            sources[k] = new DataStore();
            return sources;
        }, {}) as ColumnDataSources;
    }

    column(c: number, pin?: RevoGrid.DimensionColPin): RevoGrid.ColumnDataSchemaRegular|undefined {
        return this.getColumn(c, pin || 'col');
    }

    getColumn(c: number, type: RevoGrid.DimensionCols): RevoGrid.ColumnDataSchemaRegular|undefined {
        return this.dataSources[type].store.get('items')[c];
    }

    setColumns(columns: RevoGrid.ColumnData): void {
        const data: ColumnCollection = ColumnDataProvider.getColumns(columns);

        each(columnTypes, (k: RevoGrid.DimensionCols) => {
            this.dataSources[k].updateData(data[k])
        });

        this.dimensionProvider.setDimensionSize('col', data.sizes);
        this.dimensionProvider.setRealSize(data.col, 'col');
        this.dimensionProvider.setPins(data.colPinStart, 'colPinStart', ColumnDataProvider.getPinSizes(data.colPinStart));
        this.dimensionProvider.setPins(data.colPinEnd, 'colPinEnd', ColumnDataProvider.getPinSizes(data.colPinEnd));
    }

    private static getPinSizes(cols: RevoGrid.ColumnDataSchemaRegular[]): RevoGrid.ViewSettingSizeProp {
        return reduce(cols, (res: RevoGrid.ViewSettingSizeProp, c: RevoGrid.ColumnDataSchemaRegular, i: number) => {
            if (c.size) {
                res[i] = c.size;
            }
            return res;
        }, {});

    }

    private static isColGrouping(colData: RevoGrid.ColumnDataSchemaGrouping | RevoGrid.ColumnDataSchemaRegular): colData is RevoGrid.ColumnDataSchemaGrouping {
        return !!(colData as RevoGrid.ColumnDataSchemaGrouping).children;
    }

    // columns processing
    private static getColumns(columns: RevoGrid.ColumnData): ColumnCollection {
        return reduce(columns, (res: ColumnCollection, colData: RevoGrid.ColumnDataSchema) => {
            if (ColumnDataProvider.isColGrouping(colData)) {
                const collection: ColumnCollection = ColumnDataProvider.getColumns(colData.children);
                for (let k in collection) {
                    let key = k as keyof ColumnCollection;
                    (res[key] as RevoGrid.ColumnDataSchemaRegular[]) = {...res[key], ...collection[key]} as RevoGrid.ColumnDataSchemaRegular[];
                }
            } else {
                if (!colData.pin) {
                    res.col.push(colData);
                    if (colData.size) {
                        res.sizes[res.col.length - 1] = colData.size;
                    }
                } else {
                    res[colData.pin].push(colData);
                }
            }
            return res;
        }, {
            col: [],
            colPinStart: [],
            colPinEnd: [],
            sizes: {}
        });
    }
}

