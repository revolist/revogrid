import reduce from 'lodash/reduce';
import debounce from 'lodash/debounce';
import { columnTypes, rowTypes } from '../store/storeTypes';
import DimensionStore, { DimensionStoreCollection } from '../store/dimension/dimension.store';
import ViewportProvider from './viewport.provider';
import { getItemByIndex } from '../store/dimension/dimension.helpers';
import { gatherTrimmedItems, Trimmed } from '../store/dataSource/trimmed.plugin';
import { RESIZE_INTERVAL } from '../utils/consts';
import { ColumnRegular, DimensionSettingsState, ViewPortScrollEvent, ViewSettingSizeProp } from '..';
import { DimensionCols, DimensionType, MultiDimensionType } from '..';

export type ColumnItems = Record<DimensionCols, ColumnRegular[]>;

export type DimensionConfig = {
  realSizeChanged(k: MultiDimensionType): void;
};
/**
 * Dimension provider
 * Stores dimension information and custom sizes
 */
export default class DimensionProvider {
  readonly stores: DimensionStoreCollection;
  constructor(private viewports: ViewportProvider, config: DimensionConfig) {
    const sizeChanged = debounce((k: MultiDimensionType) => config.realSizeChanged(k), RESIZE_INTERVAL);
    this.stores = reduce(
      [...rowTypes, ...columnTypes],
      (sources: Partial<DimensionStoreCollection>, k: MultiDimensionType) => {
        sources[k] = new DimensionStore();
        sources[k].store.onChange('realSize', () => sizeChanged(k));
        return sources;
      },
      {},
    ) as DimensionStoreCollection;
  }
  
  /**
   * Clear old sizes from dimension and viewports
   * @param type - dimension type
   * @param count - count of items
   */
  clearSize(t: MultiDimensionType, count: number) {
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
  setCustomSizes(type: MultiDimensionType, sizes: ViewSettingSizeProp, keepOld = false) {
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

  setItemCount(realCount: number, type: MultiDimensionType) {
    this.viewports.stores[type].setViewport({ realCount });
    this.stores[type].setStore({ count: realCount });
  }

  /**
   * Apply trimmed items
   * @param trimmed - trimmed items
   * @param type 
   */
  setTrimmed(trimmed: Partial<Trimmed>, type: MultiDimensionType) {
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
    type: MultiDimensionType,
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

  private setNoVirtual(type: MultiDimensionType) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewport({ virtualSize: dimension.realSize });
  }

  /**
   * Drop all dimension data
   */
  dropColumns(types: MultiDimensionType[] = columnTypes) {
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
    type: MultiDimensionType,
    newLength: number,
    sizes?: ViewSettingSizeProp,
    noVirtual = false
  ) {
    this.setItemCount(newLength, type);
    this.setCustomSizes(type, sizes);

    if (noVirtual) {
      this.setNoVirtual(type);
    }
    this.updateViewport(type);
  }
  
  updateViewport(type: MultiDimensionType) {
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].lastCoordinate,
      type,
    });
  }

  setViewPortCoordinate({ coordinate, type }: { coordinate: number; type: MultiDimensionType }) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewPortCoordinate(coordinate, dimension);
  }

  getViewPortPos(e: ViewPortScrollEvent): number {
    const dimension = this.stores[e.dimension].getCurrentState();
    const item = getItemByIndex(dimension, e.coordinate);

    return item.start;
  }

  setSettings(data: Partial<DimensionSettingsState>, dimensionType: DimensionType) {
    let stores: MultiDimensionType[] = [];
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
