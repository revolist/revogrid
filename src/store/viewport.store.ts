/**
* Store is responsible for visible
* Viewport information for each dimension
* Redraw items during scrolling
*/

import {createStore, ObservableMap} from '@stencil/store';

import {
  addMissingItems,
  getFirstItem,
  getLastItem,
  getUpdatedItemsByPosition,
  isActiveRange
} from './viewport.helpers';

import {getCurrentState} from './dimension.store';
import {setStore} from './helpers';
import {
  DimensionSettingsState,
  DimensionType,
  ViewportState,
  ViewportStateItems, ViewSettingSizeProp,
  VirtualPositionItem
} from "../interfaces";

function initialState(): ViewportState {
  return {
    items: [],
    itemIndexes: [],
    frameOffset: 0,
    virtualSize: 0,
    realCount: 0
  };
};

const rowsStore: ObservableMap<ViewportState> = createStore(initialState());
const colsStore: ObservableMap<ViewportState> = createStore(initialState());


function getStoreByType(type: DimensionType): ObservableMap<ViewportState> {
  switch (type) {
    case 'col':
      return colsStore;
    case 'row':
      return rowsStore;
  }
}

function getItems(store: ObservableMap<ViewportState>): ViewportStateItems {
  return {
    items: store.get('items'),
    itemIndexes: store.get('itemIndexes')
  };
}

function setViewport(data: Partial<ViewportState>, dimensionType: DimensionType): void {
  const store = getStoreByType(dimensionType);
  if (!data.virtualSize) {
    store.set('itemIndexes', []);
    store.set('items', []);
  }
  setStore(store, data);
}

function setViewPortCoordinate(position: number, dimensionType: DimensionType): void {
  const store = getStoreByType(dimensionType);

  // no visible data to calculate
  if (!store.get('virtualSize')) {
    return;
  }

  const dimension: DimensionSettingsState = getCurrentState(dimensionType);
  const outsize: number = store.get('frameOffset') * 2 * dimension.originItemSize;
  const virtualSize = store.get('virtualSize') + outsize;

  let maxCoordinate: number = 0;
  if (dimension.realSize > virtualSize) {
    maxCoordinate = dimension.realSize - virtualSize;
  }
  let pos: number = position;
  pos -= store.get('frameOffset') * dimension.originItemSize;
  pos = pos < 0 ? 0 : pos < maxCoordinate  ? pos : maxCoordinate;


  const firstItem: VirtualPositionItem|undefined = getFirstItem(getItems(store));
  const lastItem: VirtualPositionItem|undefined = getLastItem(getItems(store));

  // left position changed
  if (!isActiveRange(pos, firstItem)) {
    const toUpdate: ViewportStateItems = getUpdatedItemsByPosition(
      pos,
      getItems(store),
      store.get('realCount'),
      virtualSize,
      dimension
    );
    setStore(store, toUpdate);
    // right position changed
  } else if (firstItem && (store.get('virtualSize') + pos) > lastItem?.end) {
    const toUpdate: ViewportStateItems = addMissingItems(
      firstItem,
      store.get('realCount'),
      virtualSize + pos - firstItem.start,
      getItems(store),
      dimension
    );

    setStore(store, {
      items: [...store.get('items'), ...toUpdate.items],
      itemIndexes: [...store.get('itemIndexes'), ...toUpdate.itemIndexes]
    });
  }
}

function setViewPortDimension(sizes: ViewSettingSizeProp, dimensionType: DimensionType): void {
  const store = getStoreByType(dimensionType);

  // viewport not inited
  if (!store.get('items').length) {
    return;
  }

  const items = store.get('items');
  let changedCoordinate: number = 0;

  for (let i of store.get('itemIndexes')) {
    let changedSize: number = 0;
    const item: VirtualPositionItem = items[i];
    // change pos if size change present before
    if (changedCoordinate) {
      item.start += changedCoordinate;
      item.end += changedCoordinate;
    }
    // change size
    const size: number = sizes[item.itemIndex] || 0;
    if (size) {
      changedSize = size - item.size;
      changedCoordinate += changedSize;
      item.size = size;
    }
    if (changedSize || changedCoordinate) {
      items[i] = {...item};
    }
  }

  setStore(store, { items });
}

export {
  setViewport,
  setViewPortCoordinate,
  setViewPortDimension,

  rowsStore,
  colsStore
};
