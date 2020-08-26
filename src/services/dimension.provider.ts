import {
    ColumnDataSchemaRegular, DataType,
    DimensionSettingsState, DimensionType,
    MultiDimensionType, ViewPortScrollEvent,
    ViewSettingSizeProp
} from '../interfaces';
import reduce from 'lodash/reduce';
import {columnTypes, rowTypes} from '../store/storeTypes';
import DimensionStore from '../store/dimension/dimension.store';
import ViewportProvider from "./viewport.provider";

type DimensionStores = {[T in MultiDimensionType]: DimensionStore};
export default class DimensionProvider {
    public readonly stores: DimensionStores;
    constructor(private viewports: ViewportProvider) {
        this.stores = reduce([...rowTypes, ...columnTypes], (sources: Partial<DimensionStores>, k: MultiDimensionType) => {
            sources[k] = new DimensionStore();
            return sources;
        }, {}) as DimensionStores;
    }

    setDimensionSize(dimensionType: MultiDimensionType, sizes: ViewSettingSizeProp): void {
        this.stores[dimensionType].setDimensionSize(sizes);
        this.viewports.stores[dimensionType].setViewPortDimension(sizes);
    }

    setRealSize(items: ColumnDataSchemaRegular[]|DataType[], dimensionType: MultiDimensionType): void {
        const realCount: number = items.length;
        this.viewports.stores[dimensionType].setViewport({ realCount });
        this.stores[dimensionType].setRealSize(realCount);
    }

    setPins(items: ColumnDataSchemaRegular[]|DataType[], dimensionType: MultiDimensionType, pinSizes?: ViewSettingSizeProp): void {
        const realCount = items.length;
        this.stores[dimensionType].setRealSize(realCount);
        this.stores[dimensionType].setDimensionSize(pinSizes);

        const dimension: DimensionSettingsState = this.stores[dimensionType].getCurrentState();
        this.viewports.stores[dimensionType].setViewport({ realCount, virtualSize: dimension.realSize });
        this.viewports.stores[dimensionType].setViewPortCoordinate(0, dimension);
    }

    setViewPortCoordinate(e: ViewPortScrollEvent): void {
        const dimension: DimensionSettingsState = this.stores[e.dimension].getCurrentState();
        this.viewports.stores[e.dimension].setViewPortCoordinate(e.coordinate, dimension);
    }

    setSettings(data: Partial<DimensionSettingsState>, dimensionType: DimensionType): void {
        let stores: MultiDimensionType[] = [];
        switch (dimensionType) {
            case 'col':
                stores = ['col', 'colPinEnd', 'colPinStart'];
                break;
            case 'row':
                stores = ['row', 'rowPinEnd', 'rowPinStart'];
                break;
        }
        for (let s of stores) {
            this.stores[s].setStore(data);
        }
    }
}
