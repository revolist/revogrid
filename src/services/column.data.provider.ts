import {
    CellTemplateFunc,
    ColumnData,
    ColumnDataSchema,
    ColumnDataSchemaGrouping,
    ColumnDataSchemaRegular,
    DataSourceColumnPins,
    DimensionColPin,
    DimensionSettingsState,
    Pin,
    ReadOnlyFormat,
    ViewSettingSizeProp
} from '../interfaces';
import {VNode} from '@stencil/core';
import reduce from 'lodash/reduce';
import dataStore, {setDataColumn} from '../store/dataSource/data.store';
import dimensionProvider from './dimension.provider';
import {setViewport, setViewPortCoordinate} from '../store/viewPort/viewport.store';
import {getCurrentState, setDimensionSize, setRealSize} from '../store/dimension/dimension.store';

type PossibleCellFunc = CellTemplateFunc<VNode>|undefined;
type ColumnCollection = {
    flat: ColumnDataSchemaRegular[];
    sizes: ViewSettingSizeProp;
} & DataSourceColumnPins;


class ColumnDataProvider {
    constructor() {}

    data(c: number, pin?: Pin): string {
        if (pin) {
            return this.getPin(c, pin)?.name || '';
        }
        return this.getColumn(c)?.name || '';
    }

    isReadOnly(r: number, c: number, _pin?: Pin): boolean {
        const readOnly: ReadOnlyFormat = this.getColumn(c)?.readonly;
        if (typeof readOnly === 'function') {
            return readOnly(r, c);
        }
        return readOnly;
    }

    template(c: number, pin?: Pin): PossibleCellFunc {
        if (pin) {
            return this.getPin(c, pin)?.cellTemplate as PossibleCellFunc;
        }
        return this.getColumn(c)?.cellTemplate as PossibleCellFunc;
    }

    getPin(c: number, pin: Pin): ColumnDataSchemaRegular|undefined {
        switch (pin) {
            case 'pinEnd':
                return dataStore.get('colPinEnd')[c];
            case 'pinStart':
                return dataStore.get('colPinStart')[c];
        }
    }

    getColumn(c: number): ColumnDataSchemaRegular|undefined {
        return dataStore.get('columnsFlat')[c];
    }

    setColumns(columns: ColumnData): void {
        const {flat, pinStart, pinEnd, sizes} = ColumnDataProvider.getColumns(columns);
        setDataColumn(flat, {colPinStart: pinStart, colPinEnd: pinEnd});

        const realCount = flat.length;
        dimensionProvider.setSize('col', sizes);
        setViewport({ realCount }, 'col');
        setRealSize(realCount, 'col' );

        ColumnDataProvider.setPins(pinStart, 'colPinStart');
        ColumnDataProvider.setPins(pinEnd, 'colPinEnd');
    }

    private static setPins(cols: ColumnDataSchemaRegular[], type: DimensionColPin): void {
        const pinSizes: ViewSettingSizeProp = reduce(cols, (res: ViewSettingSizeProp, c: ColumnDataSchemaRegular, i: number) => {
            if (c.size) {
                res[i] = c.size;
            }
            return res;
        }, {});
        const realCount = cols.length;
        setRealSize(realCount, type);
        setDimensionSize(pinSizes, type);
        const dimension: DimensionSettingsState = getCurrentState(type);
        setViewport({
            realCount,
            virtualSize: dimension.realSize
        }, type);
        setViewPortCoordinate(0, type, dimension);
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
            pinStart: [],
            pinEnd: [],
            sizes: {}
        });
    }
}

const columnProvider = new ColumnDataProvider();
export default columnProvider;
