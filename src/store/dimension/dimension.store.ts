/**
* Storing pre-calculated
* Dimension information and sizes
*/

import {createStore, ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

import {setStore} from '../../utils/store.utils';
import {calculateDimensionData} from './dimension.helpers';
import {
  DimensionSettingsState,
  ViewSettingSizeProp
} from '../../interfaces';

type Item = keyof DimensionSettingsState;

function initialState(): DimensionSettingsState {
  return {
    indexes: [],

    // item index to size
    sizes: {},

    // order in indexes[] to coordinate
    positionIndexToItem: {},

    // initial element to coordinate ^
    indexToItem: {},
    positionIndexes: [],

    // size which all items can take
    realSize: 0,

    // initial item size if it wasn't changed
    originItemSize: 0,
    frameOffset: 0
  };
}

export default class DimensionStore {
  readonly store: ObservableMap<DimensionSettingsState>;
  constructor() {
    this.store = createStore(initialState());
  }


  getCurrentState(): DimensionSettingsState {
    const state = initialState();
    const keys: Item[] = Object.keys(state) as Item[];
    return reduce(keys, (r: DimensionSettingsState, k: Item) => {
      const data = this.store.get(k);
      r[k] = data as never;
      return r;
    }, state);
  }

  setRealSize(count: number): void {
    let realSize: number = 0;
    for (let i: number = 0; i < count; i++) {
      realSize += this.store.get('sizes')[i] || this.store.get('originItemSize');
    }
    setStore(this.store, { realSize });
  }

  setStore<T extends {[key: string]: any}>(data: Partial<T>){
    setStore(this.store, data);
  }

  setDimensionSize(sizes: ViewSettingSizeProp): void {
    const dimensionData = calculateDimensionData(this.getCurrentState(), sizes);
    setStore(this.store, dimensionData);
  }
}
