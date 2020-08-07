import {
    CellTemplateFunc,
    ColumnData,
    ColumnDataSchema,
    ColumnDataSchemaGrouping,
    ColumnDataSchemaRegular,
    DataSourceState, ReadOnlyFormat, ViewSettingSizeProp
} from '../interfaces';
import {ObservableMap} from '@stencil/store';
import {VNode} from '@stencil/core';
import reduce from "lodash/reduce";
import {setDataColumn} from "../store/dataSource/data.store";
import dimensionProvider from "./dimension.provider";

type PossibleCellFunc = CellTemplateFunc<VNode>|undefined;
type StoreMap = ObservableMap<DataSourceState>;
type ColumnCollection = {
    flat: ColumnDataSchemaRegular[];
    pins: ColumnDataSchemaRegular[];
    sizes: ViewSettingSizeProp;
};

export default class ColumnDataProvider {
    constructor(private dataSourceStore: StoreMap) {}

    data(c: number): string {
        return this.getColumn(c)?.name || '';
    }

    isReadOnly(r: number, c: number): boolean {
        const readOnly: ReadOnlyFormat = this.getColumn(c)?.readonly;
        if (typeof readOnly === 'function') {
            return readOnly(r, c);
        }
        return readOnly;
    }

    template(c: number): PossibleCellFunc {
        return this.getColumn(c)?.cellTemplate as PossibleCellFunc;
    }

    getColumn(c: number): ColumnDataSchemaRegular|undefined {
        return this.dataSourceStore.get('columnsFlat')[c];
    }

    setColumns(columns: ColumnData): number {
        const {flat, pins, sizes} = ColumnDataProvider.getColumns(columns);
        setDataColumn(columns, flat);

        console.log(pins);
        // dimensionProvider.setSize(this.dimensions.row, 'row');
        dimensionProvider.setSize(sizes, 'col');
        return flat.length;
    }

    private static isColGrouping(colData: ColumnDataSchemaGrouping | ColumnDataSchemaRegular): colData is ColumnDataSchemaGrouping {
        return !!(colData as ColumnDataSchemaGrouping).children;
    }

    // columns processing
    private static getColumns(columns: ColumnData): ColumnCollection {
        return reduce(columns, (res: ColumnCollection, colData: ColumnDataSchema) => {
            if (ColumnDataProvider.isColGrouping(colData)) {
                const collection = ColumnDataProvider.getColumns(colData.children);
                res.flat.push(...collection.flat);
                res.pins.push(...collection.pins);
                // res.sizes = {...res.sizes, ...collection.sizes};
            } else {
                if (!colData.pin) {
                    res.flat.push(colData);
                    /*
                    if (colData.size) {
                        res.sizes[res.flat.length - 1] = colData.size;
                    } */
                } else {
                    res.pins.push(colData);
                }
            }
            return res;
        }, {
            flat: [],
            pins: [],
            sizes: {}
        });
    }
}