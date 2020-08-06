/**
* Storing pre-calculated
* Dimension information and sizes
*/

import {createStore, ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

import {setStore} from '../../utils/store.utils';
import {calculateDimensionData} from './dimension.helpers';
import {DimensionSettingsState, DimensionType, ViewSettingSizeProp} from '../../interfaces';

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
    originItemSize: 0
  };
}

const rowsStore: ObservableMap<DimensionSettingsState> = createStore(initialState());
const colsStore: ObservableMap<DimensionSettingsState> = createStore(initialState());

function getCurrentState(type: DimensionType): DimensionSettingsState {
  const state = initialState();
  const keys: Item[] = Object.keys(state) as Item[];
  let store = type === 'col' ? colsStore : rowsStore;
  return reduce(keys, (r: DimensionSettingsState, k: Item) => {
    const data = store.get(k);
    r[k] = data as never;
    return r;
  }, state);
}

function getStoreByType(type: DimensionType): ObservableMap<DimensionSettingsState> {
  switch (type) {
    case 'col':
      return colsStore;
    case 'row':
      return rowsStore;
  }
}

function setSettings(data: number, dimensionType: DimensionType): void {
  const store = getStoreByType(dimensionType);
  setStore(store, { originItemSize: data });
}

function setRealSize(count: number, dimensionType: DimensionType): void {
  const store = getStoreByType(dimensionType);
  let realSize: number = 0;
  for (let i: number = 0; i < count; i++) {
    realSize += store.get('sizes')[i] || store.get('originItemSize');
  }
  setStore(store, { realSize });
}

function setDimensionSize(sizes: ViewSettingSizeProp, dimensionType: DimensionType): void {
  const store: ObservableMap<DimensionSettingsState> = getStoreByType(dimensionType);
  const dimensionData = calculateDimensionData(getCurrentState(dimensionType), sizes);
  setStore(store, dimensionData);
}

export {
  rowsStore,
  colsStore,

  setDimensionSize,
  setRealSize,
  setSettings,
  getCurrentState
};
