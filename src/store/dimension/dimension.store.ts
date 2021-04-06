/**
 * Storing pre-calculated
 * Dimension information and sizes
 */

import { createStore } from '@stencil/store';
import reduce from 'lodash/reduce';

import { setStore } from '../../utils/store.utils';
import { calculateDimensionData, DimensionSize } from './dimension.helpers';
import { Observable, RevoGrid } from '../../interfaces';

type Item = keyof RevoGrid.DimensionSettingsState;

function initialBase(): RevoGrid.DimensionCalc {
  return {
    indexes: [],
    // item index to size
    sizes: {},
    // order in indexes[] to coordinate
    positionIndexToItem: {},
    // initial element to coordinate ^
    indexToItem: {},
    positionIndexes: []
  };
}

function initialState(): RevoGrid.DimensionSettingsState {
  return {
    ...initialBase(),
    // size which all items can take
    realSize: 0,

    // initial item size if it wasn't changed
    originItemSize: 0,
    frameOffset: 0,
  };
}

export default class DimensionStore {
  readonly store: Observable<RevoGrid.DimensionSettingsState>;
  constructor() {
    this.store = createStore(initialState());
  }

  getCurrentState(): RevoGrid.DimensionSettingsState {
    const state = initialState();
    const keys: Item[] = Object.keys(state) as Item[];
    return reduce(
      keys,
      (r: RevoGrid.DimensionSettingsState, k: Item) => {
        const data = this.store.get(k);
        r[k] = data as never;
        return r;
      },
      state,
    );
  }

  setRealSize(count: number): void {
    let realSize = 0;
    for (let i = 0; i < count; i++) {
      realSize += this.store.get('sizes')[i] || this.store.get('originItemSize');
    }
    setStore(this.store, { realSize });
  }

  setStore<T extends { [key: string]: any }>(data: Partial<T>) {
    setStore(this.store, data);
  }

  drop() {
    setStore(this.store, initialBase());
  }

  setDimensionSize(sizes: RevoGrid.ViewSettingSizeProp) {
    const dimensionData: DimensionSize = calculateDimensionData(this.getCurrentState(), sizes);
    setStore(this.store, dimensionData);
    return dimensionData;
  }
}
