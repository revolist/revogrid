import reduce from 'lodash/reduce';
import debounce from 'lodash/debounce';
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
import type {
  DimensionCols,
  DimensionType,
  MultiDimensionType,
  ColumnRegular,
  DimensionSettingsState,
  ViewPortScrollEvent,
  ViewSettingSizeProp,
  ViewportState,
} from '@type';
import { getColumnSizes } from '../utils/column.utils';

export type DimensionConfig = {
  realSizeChanged(k: MultiDimensionType): void;
};
/**
 * Dimension provider
 * Stores dimension information and custom sizes
 * 
 * @dependsOn ViewportProvider
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
      (sources: Partial<DimensionStoreCollection>, t: MultiDimensionType) => {
        sources[t] = new DimensionStore(t);
        sources[t].store.onChange('realSize', () => sizeChanged(t));
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
    this.setViewPortCoordinate({
      type,
      force: true,
    });
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
  setTrimmed(trimmed: Trimmed, type: MultiDimensionType) {
    const allTrimmed = gatherTrimmedItems(trimmed);
    const dimStoreType = this.stores[type];
    dimStoreType.setStore({ trimmed: allTrimmed });
    this.setViewPortCoordinate({
      type,
      force: true,
    });
  }

  /**
   * Sets dimension data and viewport coordinate
   * @param itemCount
   * @param type - dimension type
   * @param noVirtual - disable virtual data
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
    this.setViewPortCoordinate({
      type,
    });
  }

  /**
   * Applies new columns to the dimension provider
   * @param columns - new columns data
   * @param disableVirtualX - disable virtual data for X axis
   */
  applyNewColumns(
    columns: Record<DimensionCols, ColumnRegular[]>,
    disableVirtualX: boolean,
    keepOld = false,
  ) {
    // Apply new columns to dimension provider
    for (let type of columnTypes) {
      if (!keepOld) {
        // Clear existing data in the dimension provider
        this.stores[type].drop();
      }

      // Get the new columns for the current type
      const items = columns[type];

      // Determine if virtual data should be disabled for the current type
      const noVirtual = type !== 'rgCol' || disableVirtualX;

      // Set the items count in the dimension provider
      this.stores[type].setStore({ count: items.length });

      // Set the custom sizes for the columns
      const newSizes = getColumnSizes(items);
      this.stores[type].setDimensionSize(newSizes);

      // Update the viewport with new data
      const vpUpdate: Partial<ViewportState> = {
        // This triggers drop on realCount change
        realCount: items.length,
      };

      // If virtual data is disabled, set the virtual size to the real size
      if (noVirtual) {
        vpUpdate.virtualSize = this.stores[type].getCurrentState().realSize;
      }

      // Update the viewport
      this.viewports.stores[type].setViewport(vpUpdate);
      this.setViewPortCoordinate({
        type,
      });
    }
  }

  /**
   * Gets the full size of the grid by summing up the sizes of all dimensions
   * Goes through all dimensions columnTypes (x) and rowTypes (y) and sums up their sizes
   */

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

  setViewPortCoordinate({
    type,
    coordinate = this.viewports.stores[type].lastCoordinate,
    force = false,
  }: {
    coordinate?: number;
    type: MultiDimensionType;
    force?: boolean;
  }) {
    const dimension = this.stores[type].getCurrentState();
    this.viewports.stores[type].setViewPortCoordinate(
      coordinate,
      dimension,
      force,
    );
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

  updateSizesPositionByNewDataIndexes(
    type: MultiDimensionType,
    newItemsOrder: number[],
    prevItemsOrder: number[] = [],
  ) {
    // Move custom sizes to new order
    this.stores[type].updateSizesPositionByIndexes(
      newItemsOrder,
      prevItemsOrder,
    );
    this.setViewPortCoordinate({
      type,
      force: true,
    });
  }
}
