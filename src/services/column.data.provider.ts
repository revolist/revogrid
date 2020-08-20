import reduce from 'lodash/reduce';
import dataStore, {setDataColumn} from '../store/dataSource/data.store';
import dimensionProvider from './dimension.provider';

import {
    ColumnData,
    ColumnDataSchema,
    ColumnDataSchemaGrouping,
    ColumnDataSchemaRegular,
    DataSourceColumnPins,
    DimensionColPin,
    ViewSettingSizeProp
} from '../interfaces';

type ColumnCollection = {
    flat: ColumnDataSchemaRegular[];
    sizes: ViewSettingSizeProp;
} & DataSourceColumnPins;


class ColumnDataProvider {
    column(c: number, pin?: DimensionColPin): ColumnDataSchemaRegular|undefined {
        if (pin) {
            return this.getPin(c, pin);
        }
        return this.getColumn(c);
    }

    getPin(c: number, pin: DimensionColPin): ColumnDataSchemaRegular|undefined {
        return dataStore.get(pin)[c];
    }

    getColumn(c: number): ColumnDataSchemaRegular|undefined {
        return dataStore.get('columnsFlat')[c];
    }

    setColumns(columns: ColumnData): void {
        const {flat, colPinStart, colPinEnd, sizes} = ColumnDataProvider.getColumns(columns);
        setDataColumn(flat, {colPinStart, colPinEnd});

        dimensionProvider.setDimensionSize('col', sizes);
        dimensionProvider.setRealSize(flat, 'col');
        dimensionProvider.setPins(colPinStart, 'colPinStart', ColumnDataProvider.getPinSizes(colPinStart));
        dimensionProvider.setPins(colPinEnd, 'colPinEnd', ColumnDataProvider.getPinSizes(colPinEnd));
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
                    res.flat.push(colData);
                    if (colData.size) {
                        res.sizes[res.flat.length - 1] = colData.size;
                    }
                } else {
                    res[colData.pin].push(colData);
                }
            }
            return res;
        }, {
            flat: [],
            colPinStart: [],
            colPinEnd: [],
            sizes: {}
        });
    }
}

const columnProvider = new ColumnDataProvider();
export default columnProvider;
