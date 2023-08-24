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
/**
 * Dimension provider
 * Stores dimension information and custom sizes
 */
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
  
  /**
   * Clear old sizes from dimension and viewports
   * @param type - dimension type
   * @param count - count of items
   */
  clearSize(t: RevoGrid.MultiDimensionType, count: number) {
    this.stores[t].drop();
    // after we done with drop trigger viewport recalculaction
    this.viewports.stores[t].setOriginalSizes(this.stores[t].store.get('originItemSize'));
    this.setItemCount(count, t);
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
    this.viewports.stores[type].setViewPortDimensionSizes(
      newSizes,
      !keepOld ? this.stores[type].store.get('originItemSize') : undefined
    );
  }

  setItemCount(realCount: number, type: RevoGrid.MultiDimensionType) {
    this.viewports.stores[type].setViewport({ realCount });
    this.stores[type].setStore({ count: realCount });
  }

  /**
   * Apply trimmed items
   * @param trimmed - trimmed items
   * @param type 
   */
  setTrimmed(trimmed: Partial<Trimmed>, type: RevoGrid.MultiDimensionType) {
    const allTrimmed = gatherTrimmedItems(trimmed);
    const dimStoreType = this.stores[type];
    dimStoreType.setStore({ trimmed: allTrimmed });
    this.viewports.stores[type].setViewPortDimensionSizes(dimStoreType.store.get('sizes'));
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
    this.setItemCount(itemCount, type);
    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.updateViewport(type);
  }
  /**
   * Virtualization will get disabled
   * @param type - dimension type
   */

  private setNoVirtual(type: RevoGrid.MultiDimensionType) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewport({ virtualSize: dimension.realSize });
  }

  /**
   * Drop all dimension data
   */
  dropColumns(types: RevoGrid.MultiDimensionType[] = columnTypes) {
    for (let type of types) {
      this.stores[type].drop();
      this.viewports.stores[type].clearItems(); // check if needed
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

  setNewColumns(
    type: RevoGrid.MultiDimensionType,
    newLength: number,
    sizes?: RevoGrid.ViewSettingSizeProp,
    noVirtual = false
  ) {
    this.setItemCount(newLength, type);
    this.setCustomSizes(type, sizes);

    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.updateViewport(type);
  }
  
  updateViewport(type: RevoGrid.MultiDimensionType) {
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].lastCoordinate,
      type,
    });
  }

  setViewPortCoordinate({ coordinate, type }: { coordinate: number; type: RevoGrid.MultiDimensionType }) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewPortCoordinate(coordinate, dimension);
  }

  getViewPortPos(e: RevoGrid.ViewPortScrollEvent): number {
    const dimension: RevoGrid.DimensionSettingsState = this.stores[e.dimension].getCurrentState();
    const item = getItemByIndex(dimension, e.coordinate);

    return item.start;
  }

  setSettings(data: Partial<RevoGrid.DimensionSettingsState>, dimensionType: RevoGrid.DimensionType) {
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
