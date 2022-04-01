import reduce from 'lodash/reduce';
import { debounce } from 'lodash';
import { columnTypes, rowTypes } from '../store/storeTypes';
import DimensionStore from '../store/dimension/dimension.store';
import ViewportProvider from './viewport.provider';
import { RevoGrid } from '../interfaces';
import { getItemByIndex } from '../store/dimension/dimension.helpers';
import { gatherTrimmedItems, Trimmed } from '../store/dataSource/trimmed.plugin';
import { RESIZE_INTERVAL } from '../utils/consts';

export type ColumnItems = Record<RevoGrid.DimensionCols, RevoGrid.ColumnRegular[]>;

export type DimensionStores = { [T in RevoGrid.MultiDimensionType]: DimensionStore };
export type DimensionConfig = {
  realSizeChanged(k: RevoGrid.MultiDimensionType): void;
};
export default class DimensionProvider {
  readonly stores: DimensionStores;
  constructor(private viewports: ViewportProvider, config: DimensionConfig) {
    const sizeChanged = debounce((k: RevoGrid.MultiDimensionType) => config.realSizeChanged(k), RESIZE_INTERVAL);
    this.stores = reduce(
      [...rowTypes, ...columnTypes],
      (sources: Partial<DimensionStores>, k: RevoGrid.MultiDimensionType) => {
        sources[k] = new DimensionStore();
        sources[k].store.onChange('realSize', () => sizeChanged(k));
        return sources;
      },
      {},
    ) as DimensionStores;
  }
  
  clearSize(t: RevoGrid.MultiDimensionType, count: number): void {
    this.stores[t].drop();
    // after we done with drop trigger viewport recalculaction
    this.viewports.stores[t].setOriginalSizes(this.stores[t].store.get('originItemSize'));
    this.setRealSize(count, t);
  }

  setDimensionSize(type: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp): void {
    this.stores[type].setDimensionSize(sizes);
    this.viewports.stores[type].setViewPortDimension(sizes);
  }

  setRealSize(realCount: number, type: RevoGrid.MultiDimensionType): void {
    this.viewports.stores[type].setViewport({ realCount }, type);
    this.stores[type].setStore({ count: realCount });
  }

  setTrimmed(trimmed: Partial<Trimmed>, type: RevoGrid.MultiDimensionType) {
    const allTrimmed = gatherTrimmedItems(trimmed);
    this.stores[type].setStore({ trimmed: allTrimmed });
    this.viewports.stores[type].setViewPortDimension(this.stores[type].store.get('sizes'));
  }

  /**
   * Sets dimension data and view port coordinate
   * @param items - data/column items
   * @param type - dimension type
   */
  setData(
    itemCount: number,
    type: RevoGrid.MultiDimensionType,
    noVirtual = false
  ) {
    this.setRealSize(itemCount, type);
    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.updateViewport(type);
  }

  private setNoVirtual(type: RevoGrid.MultiDimensionType) {
    const dimension: RevoGrid.DimensionSettingsState = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewport({ virtualSize: dimension.realSize }, type);
  }

  drop() {
    for (let type of columnTypes) {
      this.stores[type].drop();
    }
  }

  getFullSize(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (let type of columnTypes) {
      x += this.stores[type]?.store.get('realSize') || 0;
    }
    for (let type of rowTypes) {
      y += this.stores[type]?.store.get('realSize') || 0;
    }
    return { y, x };
  }

  setColumns(
    type: RevoGrid.MultiDimensionType,
    sizes?: RevoGrid.ViewSettingSizeProp,
    noVirtual = false
  ) {
    this.setDimensionSize(type, sizes);

    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.updateViewport(type);
  }
  
  updateViewport(type: RevoGrid.MultiDimensionType) {
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].store.get('lastCoordinate'),
      type,
    });
  }

  setViewPortCoordinate({ coordinate, type }: { coordinate: number; type: RevoGrid.MultiDimensionType }): void {
    const dimension = this.stores[type].getCurrentState();
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
