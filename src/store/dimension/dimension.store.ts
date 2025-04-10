/**
 * Storing pre-calculated
 * Dimension information and sizes
 */
import reduce from 'lodash/reduce';
import { createStore } from '@stencil/store';

import { setStore, Observable } from '../../utils';
import { calculateDimensionData } from './dimension.helpers';
import {
  DimensionCalc,
  DimensionSettingsState,
  ViewSettingSizeProp,
  MultiDimensionType,
} from '@type';
import { recalculateRealSizePlugin } from './dimension.recalculate.plugin';
import { trimmedPlugin } from './dimension.trim.plugin';

export type DimensionStoreCollection = {
  [T in MultiDimensionType]: DimensionStore;
};

type Item = keyof DimensionSettingsState;

function initialBase(): DimensionCalc {
  return {
    indexes: [],
    count: 0,

    // hidden items
    trimmed: null,

    // virtual item index to size
    sizes: {},
    // order in indexes[] to coordinate
    positionIndexToItem: {},
    // initial element to coordinate ^
    indexToItem: {},
    positionIndexes: [],
  };
}

function initialState(): DimensionSettingsState {
  return {
    ...initialBase(),
    // size which all items can take
    realSize: 0,

    // initial item size if it wasn't changed
    originItemSize: 0,
  };
}

export class DimensionStore {
  readonly store: Observable<DimensionSettingsState>;
  constructor(public readonly type: MultiDimensionType) {
    this.store = createStore(initialState());
    this.store.use(trimmedPlugin({
      store: this.store,
      setSizes: this.setDimensionSize.bind(this),
    }));
    this.store.use(recalculateRealSizePlugin({
      store: this.store,
      setStore: this.setStore.bind(this),
    }));
  }

  getCurrentState(): DimensionSettingsState {
    const state = initialState();
    const keys = Object.keys(state);
    return reduce(
      keys,
      (r: DimensionSettingsState, k: Item) => {
        const data = this.store.get(k);
        r[k] = data as never;
        return r;
      },
      state,
    );
  }

  dispose() {
    setStore(this.store, initialState());
  }

  setStore<T extends Record<string, any>>(data: Partial<T>) {
    setStore(this.store, data);
  }

  drop() {
    setStore(this.store, initialBase());
  }

  /**
   * Set custom dimension sizes and overwrite old
   * Generates new indexes based on sizes
   * @param sizes - sizes to set
   */
  setDimensionSize(sizes: ViewSettingSizeProp = {}) {
    const dimensionData = calculateDimensionData(
      this.store.get('originItemSize'),
      sizes,
    );
    setStore(this.store, {
      ...dimensionData,
      sizes,
    });
  }

  updateSizesPositionByIndexes(newItemsOrder: number[], prevItemsOrder: number[] = []) {
    // Move custom sizes to new order
    const customSizes = {...this.store.get('sizes')};
    if (!Object.keys(customSizes).length) {
      return;
    }
    // Step 1: Create a map of original indices, but allow duplicates by storing arrays of indices
    const originalIndices: Record<number, number[]> = {};
    prevItemsOrder.forEach((physIndex, virtIndex) => {
      if (!originalIndices[physIndex]) {
        originalIndices[physIndex] = [];
      }
      originalIndices[physIndex].push(virtIndex); // Store all indices for each value
    });

    // Step 2: Create new sizes based on new item order
    const newSizes: Record<number, number> = {};

    newItemsOrder.forEach((physIndex, virtIndex) => {
      const indices = originalIndices[physIndex]; // Get all original indices for this value
      
      if (indices && indices.length > 0) {
        const originalIndex = indices.shift(); // Get the first available original index

        if (originalIndex !== undefined && originalIndex !== virtIndex && customSizes[originalIndex]) {
          newSizes[virtIndex] = customSizes[originalIndex];
          delete customSizes[originalIndex];
        }
      }
    });

    // Step 3: Set new sizes if there are changes
    if (Object.keys(newSizes).length) {
      this.setDimensionSize({
        ...customSizes,
        ...newSizes,
      });
    }
  }
}
