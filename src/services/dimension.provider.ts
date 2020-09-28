
import reduce from 'lodash/reduce';
import {columnTypes, rowTypes} from '../store/storeTypes';
import DimensionStore from '../store/dimension/dimension.store';
import ViewportProvider from "./viewport.provider";
import {RevoGrid} from "../interfaces";

type Columns = {
    sizes: RevoGrid.ViewSettingSizeProp;
} & {[T in RevoGrid.DimensionCols]: RevoGrid.ColumnRegular[];};
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

    setRealSize(items: RevoGrid.ColumnRegular[]|RevoGrid.DataType[], dimensionType: RevoGrid.MultiDimensionType): void {
        const realCount: number = items.length;
        this.viewports.stores[dimensionType].setViewport({ realCount });
        this.stores[dimensionType].setRealSize(realCount);
    }

    setData(items: RevoGrid.ColumnRegular[]|RevoGrid.DataType[], type: RevoGrid.DimensionType) {
        this.setRealSize(items, type);
        this.setViewPortCoordinate({
            coordinate: this.viewports.stores[type].store.get('lastCoordinate'),
            dimension: type
        });
    }

    setPins(
        items: RevoGrid.ColumnRegular[]|RevoGrid.DataType[],
        dimensionType: RevoGrid.MultiDimensionType,
        pinSizes?: RevoGrid.ViewSettingSizeProp
    ): void {
        this.setRealSize(items, dimensionType);
        this.stores[dimensionType].setDimensionSize(pinSizes);

        const dimension: RevoGrid.DimensionSettingsState = this.stores[dimensionType].getCurrentState();
        this.viewports.stores[dimensionType].setViewport({ virtualSize: dimension.realSize });

        const coordinate = this.viewports.stores[dimensionType].store.get('lastCoordinate');
        this.viewports.stores[dimensionType].setViewPortCoordinate(coordinate, dimension);
    }

    setMainArea(dimension: RevoGrid.DimensionType, columns: Columns): void {
        this.setRealSize(columns.col, dimension);
        this.stores[dimension].setDimensionSize(columns.sizes);
        const coordinate = this.viewports.stores[dimension].store.get('lastCoordinate');
        this.setViewPortCoordinate({ coordinate, dimension });
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
