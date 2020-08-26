import reduce from 'lodash/reduce';
import each from 'lodash/each';

import {
    ColumnData,
    ColumnDataSchema,
    ColumnDataSchemaGrouping,
    ColumnDataSchemaRegular,
    DimensionColPin, DimensionCols,
    ViewSettingSizeProp
} from '../interfaces';
import DataStore from "../store/dataSource/data.store";
import {columnTypes} from "../store/storeTypes";
import DimensionProvider from "./dimension.provider";

type ColumnCollection = {
    sizes: ViewSettingSizeProp;
} & {[T in DimensionCols]: ColumnDataSchemaRegular[];};

type ColumnDataSources = {[T in DimensionCols]: DataStore<ColumnDataSchemaRegular>};

export default class ColumnDataProvider {
    private readonly dataSources: ColumnDataSources;
    get stores(): ColumnDataSources {
        return this.dataSources;
    }
    constructor(private dimensionProvider: DimensionProvider) {
        this.dataSources = reduce(columnTypes, (sources: Partial<ColumnDataSources>, k: DimensionCols) => {
            sources[k] = new DataStore();
            return sources;
        }, {}) as ColumnDataSources;
    }

    column(c: number, pin?: DimensionColPin): ColumnDataSchemaRegular|undefined {
        return this.getColumn(c, pin || 'col');
    }

    getColumn(c: number, type: DimensionCols): ColumnDataSchemaRegular|undefined {
        return this.dataSources[type].store.get('items')[c];
    }

    setColumns(columns: ColumnData): void {
        const data: ColumnCollection = ColumnDataProvider.getColumns(columns);

        each(columnTypes, (k: DimensionCols) => {
            this.dataSources[k].updateData(data[k])
        });

        this.dimensionProvider.setDimensionSize('col', data.sizes);
        this.dimensionProvider.setRealSize(data.col, 'col');
        this.dimensionProvider.setPins(data.colPinStart, 'colPinStart', ColumnDataProvider.getPinSizes(data.colPinStart));
        this.dimensionProvider.setPins(data.colPinEnd, 'colPinEnd', ColumnDataProvider.getPinSizes(data.colPinEnd));
    }

    private static getPinSizes(cols: ColumnDataSchemaRegular[]): ViewSettingSizeProp {
        return reduce(cols, (res: ViewSettingSizeProp, c: ColumnDataSchemaRegular, i: number) => {
            if (c.size) {
                res[i] = c.size;
            }
            return res;
        }, {});

    }

    private static isColGrouping(colData: ColumnDataSchemaGrouping | ColumnDataSchemaRegular): colData is ColumnDataSchemaGrouping {
        return !!(colData as ColumnDataSchemaGrouping).children;
    }

    // columns processing
    private static getColumns(columns: ColumnData): ColumnCollection {
        return reduce(columns, (res: ColumnCollection, colData: ColumnDataSchema) => {
            if (ColumnDataProvider.isColGrouping(colData)) {
                const collection: ColumnCollection = ColumnDataProvider.getColumns(colData.children);
                for (let k in collection) {
                    let key = k as keyof ColumnCollection;
                    (res[key] as ColumnDataSchemaRegular[]) = {...res[key], ...collection[key]} as ColumnDataSchemaRegular[];
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

