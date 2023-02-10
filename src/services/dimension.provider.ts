import reduce from 'lodash/reduce';
import { columnTypes, rowTypes } from '../store/storeTypes';
import DimensionStore from '../store/dimension/dimension.store';
import ViewportProvider from './viewport.provider';
import { RevoGrid } from '../interfaces';
import { getItemByIndex } from '../store/dimension/dimension.helpers';

export type ColumnItems = Record<RevoGrid.DimensionCols, RevoGrid.ColumnRegular[]>;

export type DimensionStores = { [T in RevoGrid.MultiDimensionType]: DimensionStore };
export default class DimensionProvider {
  public readonly stores: DimensionStores;
  constructor(private viewports: ViewportProvider) {
    this.stores = reduce(
      [...rowTypes, ...columnTypes],
      (sources: Partial<DimensionStores>, k: RevoGrid.MultiDimensionType) => {
        sources[k] = new DimensionStore();
        return sources;
      },
      {},
    ) as DimensionStores;
  }

  setDimensionSize(dimensionType: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp): void {
    this.stores[dimensionType].setDimensionSize(sizes);
    this.viewports.stores[dimensionType].setViewPortDimension(sizes);
  }

  setRealSize(realCount: number, type: RevoGrid.MultiDimensionType): void {
    this.viewports.stores[type].setViewport({ realCount });
    this.stores[type].setRealSize(realCount);
  }

  /**
   * Apply new custom sizes to dimension and view port
   * @param type - dimension type
   * @param sizes - new custom sizes
   * @param keepOld - keep old sizes merge new with old
   */
  setCustomSizes(type: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp, keepOld = false) {
    let newSizes = sizes;
    if (keepOld) {
      const oldSizes = this.stores[type].store.get('sizes');
      newSizes = {
        ...oldSizes,
        ...sizes,
      };
    }
    this.stores[type].setDimensionSize(newSizes);
    this.viewports.stores[type].setViewPortDimension(
      newSizes,
      !keepOld ? this.stores[type].store.get('originItemSize') : undefined
    );
  }

  /**
   * Sets dimension data and view port coordinate
   * @param items - data/column items
   * @param type - dimension type
   */
  setData(items: RevoGrid.ColumnRegular[] | RevoGrid.DataType[], type: RevoGrid.MultiDimensionType, noVirtual = false) {
    this.setRealSize(items.length, type);
    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].store.get('lastCoordinate'),
      type,
    });
  }

  private setNoVirtual(type: RevoGrid.MultiDimensionType) {
    const dimension: RevoGrid.DimensionSettingsState = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewport({ virtualSize: dimension.realSize });
  }

  drop() {
    for (let type of columnTypes) {
      this.stores[type].drop();  
    }
  }

  setColumns(
    type: RevoGrid.MultiDimensionType,
    newLength: number,
    sizes?: RevoGrid.ViewSettingSizeProp,
    noVirtual = false
  ) {
    this.setRealSize(newLength, type);
    this.setCustomSizes(type, sizes);

    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].store.get('lastCoordinate'),
      type,
    });
  }

  setViewPortCoordinate({ coordinate, type }: { coordinate: number; type: RevoGrid.MultiDimensionType }): void {
    const dimension: RevoGrid.DimensionSettingsState = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewPortCoordinate(coordinate, dimension);
  }

  getViewPortPos(e: RevoGrid.ViewPortScrollEvent): number {
    const dimension: RevoGrid.DimensionSettingsState = this.stores[e.dimension].getCurrentState();
    const item = getItemByIndex(dimension, e.coordinate);

    return item.start;
  }

  setSettings(data: Partial<RevoGrid.DimensionSettingsState>, dimensionType: RevoGrid.DimensionType): void {
    let stores: RevoGrid.MultiDimensionType[] = [];
    switch (dimensionType) {
      case 'rgCol':
        stores = columnTypes;
        break;
      case 'rgRow':
        stores = rowTypes;
        break;
    }
    for (let s of stores) {
      this.stores[s].setStore(data);
    }
  }
}
