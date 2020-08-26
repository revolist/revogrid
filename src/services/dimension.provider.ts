
import reduce from 'lodash/reduce';
import {columnTypes, rowTypes} from '../store/storeTypes';
import DimensionStore from '../store/dimension/dimension.store';
import ViewportProvider from "./viewport.provider";
import {RevoGrid} from "../interfaces";

type DimensionStores = {[T in RevoGrid.MultiDimensionType]: DimensionStore};
export default class DimensionProvider {
    public readonly stores: DimensionStores;
    constructor(private viewports: ViewportProvider) {
        this.stores = reduce([...rowTypes, ...columnTypes], (sources: Partial<DimensionStores>, k: RevoGrid.MultiDimensionType) => {
            sources[k] = new DimensionStore();
            return sources;
        }, {}) as DimensionStores;
    }

    setDimensionSize(dimensionType: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp): void {
        this.stores[dimensionType].setDimensionSize(sizes);
        this.viewports.stores[dimensionType].setViewPortDimension(sizes);
    }

    setRealSize(items: RevoGrid.ColumnDataSchemaRegular[]|RevoGrid.DataType[], dimensionType: RevoGrid.MultiDimensionType): void {
        const realCount: number = items.length;
        this.viewports.stores[dimensionType].setViewport({ realCount });
        this.stores[dimensionType].setRealSize(realCount);
    }

    setPins(items: RevoGrid.ColumnDataSchemaRegular[]|RevoGrid.DataType[], dimensionType: RevoGrid.MultiDimensionType, pinSizes?: RevoGrid.ViewSettingSizeProp): void {
        const realCount = items.length;
        this.stores[dimensionType].setRealSize(realCount);
        this.stores[dimensionType].setDimensionSize(pinSizes);

        const dimension: RevoGrid.DimensionSettingsState = this.stores[dimensionType].getCurrentState();
        this.viewports.stores[dimensionType].setViewport({ realCount, virtualSize: dimension.realSize });
        this.viewports.stores[dimensionType].setViewPortCoordinate(0, dimension);
    }

    setViewPortCoordinate(e: RevoGrid.ViewPortScrollEvent): void {
        const dimension: RevoGrid.DimensionSettingsState = this.stores[e.dimension].getCurrentState();
        this.viewports.stores[e.dimension].setViewPortCoordinate(e.coordinate, dimension);
    }

    setSettings(data: Partial<RevoGrid.DimensionSettingsState>, dimensionType: RevoGrid.DimensionType): void {
        let stores: RevoGrid.MultiDimensionType[] = [];
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
