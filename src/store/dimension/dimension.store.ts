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
  DimensionType,
  MultiDimensionType,
  ViewSettingSizeProp
} from '../../interfaces';

type Item = keyof DimensionSettingsState;
type DimensionStore = {[T in MultiDimensionType]: ObservableMap<DimensionSettingsState>};

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

const dimensionStore: DimensionStore = {
  col: createStore(initialState()),
  colPinStart: createStore(initialState()),
  colPinEnd: createStore(initialState()),
  row: createStore(initialState()),
  rowPinStart: createStore(initialState()),
  rowPinEnd: createStore(initialState())
};

function getCurrentState(type: MultiDimensionType): DimensionSettingsState {
  const state = initialState();
  const keys: Item[] = Object.keys(state) as Item[];
  let store = getStoreByType(type);
  return reduce(keys, (r: DimensionSettingsState, k: Item) => {
    const data = store.get(k);
    r[k] = data as never;
    return r;
  }, state);
}

function getStoreByType(type: MultiDimensionType): ObservableMap<DimensionSettingsState> {
  return dimensionStore[type];
}

function setSettings(data: Partial<DimensionSettingsState>, dimensionType: DimensionType): void {
  let stores: MultiDimensionType[] = [];
  switch (dimensionType) {
    case 'col':
      stores = ['col', 'colPinEnd', 'colPinStart'];
      break;
    case 'row':
      stores = ['row', 'rowPinEnd', 'rowPinStart'];
      break;
  }
  for (let s of stores) {
    const store = getStoreByType(s);
    setStore(store, data);
  }
}

function setRealSize(count: number, dimensionType: MultiDimensionType): void {
  const store = getStoreByType(dimensionType);
  let realSize: number = 0;
  for (let i: number = 0; i < count; i++) {
    realSize += store.get('sizes')[i] || store.get('originItemSize');
  }
  setStore(store, { realSize });
}

function setDimensionSize(sizes: ViewSettingSizeProp, dimensionType: MultiDimensionType): void {
  const store: ObservableMap<DimensionSettingsState> = getStoreByType(dimensionType);
  const dimensionData = calculateDimensionData(getCurrentState(dimensionType), sizes);
  setStore(store, dimensionData);
}

export default dimensionStore;

export {
  setDimensionSize,
  setRealSize,
  setSettings,
  getCurrentState
};
