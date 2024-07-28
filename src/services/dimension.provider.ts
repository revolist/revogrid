import reduce from 'lodash/reduce';
import debounce from 'lodash/debounce';
import ColumnDataProvider from './column.data.provider';
import ViewportProvider from './viewport.provider';
import { RESIZE_INTERVAL } from '../utils/consts';

import {
  columnTypes,
  rowTypes,
  getItemByIndex,
  DimensionStore,
  DimensionStoreCollection,
  gatherTrimmedItems,
  Trimmed,
} from '@store';
import {
  DimensionCols,
  DimensionType,
  MultiDimensionType,
  ColumnRegular,
  DimensionSettingsState,
  ViewPortScrollEvent,
  ViewSettingSizeProp,
  ViewportState,
} from '@type';

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
  constructor(
    private viewports: ViewportProvider,
    config: DimensionConfig,
  ) {
    const sizeChanged = debounce(
      (k: MultiDimensionType) => config.realSizeChanged(k),
      RESIZE_INTERVAL,
    );
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
    this.viewports.stores[t].setOriginalSizes(
      this.stores[t].store.get('originItemSize'),
    );
    this.setItemCount(count, t);
  }

  /**
   * Apply new custom sizes to dimension and view port
   * @param type - dimension type
   * @param sizes - new custom sizes
   * @param keepOld - keep old sizes merge new with old
   */
  setCustomSizes(
    type: MultiDimensionType,
    sizes: ViewSettingSizeProp,
    keepOld = false,
  ) {
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
      !keepOld ? this.stores[type].store.get('originItemSize') : undefined,
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
    this.viewports.stores[type].setViewPortDimensionSizes(
      dimStoreType.store.get('sizes'),
    );
  }

  /**
   * Sets dimension data and view port coordinate
   * @param items - data/column items
   * @param type - dimension type
   */
  setData(itemCount: number, type: MultiDimensionType, noVirtual = false) {
    this.setItemCount(itemCount, type);

    // Virtualization will get disabled
    if (noVirtual) {
      const dimension = this.stores[type].getCurrentState();
      this.viewports.stores[type].setViewport({
        virtualSize: dimension.realSize,
      });
    }
    this.updateViewport(type);
  }

  applyNewColumns(
    columns: Record<DimensionCols, ColumnRegular[]>,
    disableVirtualX: boolean,
  ) {
    for (let type of columnTypes) {
      // clear existing data
      this.stores[type].drop();

      const items = columns[type];

      // for pinned col no need virtual data
      const noVirtual = type !== 'rgCol' || disableVirtualX;

      // setItemCount
      this.stores[type].setStore({ count: items.length });

      // setCustomSizes
      const newSizes = ColumnDataProvider.getSizes(items);
      this.stores[type].setDimensionSize(newSizes);

      const vpUpdate: Partial<ViewportState> = {
        // this triggers drop on realCount change
        realCount: items.length,
      };

      // Virtualization will get disabled
      if (noVirtual) {
        vpUpdate.virtualSize = this.stores[type].getCurrentState().realSize;
      }

      this.viewports.stores[type].setViewport(vpUpdate);
      this.setViewPortCoordinate({
        coordinate: this.viewports.stores[type].lastCoordinate,
        type,
      });
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

  updateViewport(type: MultiDimensionType) {
    this.setViewPortCoordinate({
      coordinate: this.viewports.stores[type].lastCoordinate,
      type,
    });
  }

  setViewPortCoordinate({
    coordinate,
    type,
  }: {
    coordinate: number;
    type: MultiDimensionType;
  }) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewPortCoordinate(coordinate, dimension);
  }

  getViewPortPos(e: ViewPortScrollEvent): number {
    const dimension = this.stores[e.dimension].getCurrentState();
    const item = getItemByIndex(dimension, e.coordinate);

    return item.start;
  }

  setSettings(
    data: Partial<DimensionSettingsState>,
    dimensionType: DimensionType,
  ) {
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
