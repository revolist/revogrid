/**
* Store is responsible for visible
* Viewport information for each dimension
* Redraw items during scrolling
*/

import {createStore, ObservableMap} from '@stencil/store';

import {
  addMissingItems, DimensionDataViewport,
  getFirstItem,
  getLastItem,
  getUpdatedItemsByPosition,
  isActiveRange
} from './viewport.helpers';

import {setStore} from '../../utils/store.utils';
import {
  MultiDimensionType,
  ViewportState,
  ViewportStateItems, ViewSettingSizeProp,
  VirtualPositionItem
} from '../../interfaces';

type ViewportStore = {[T in MultiDimensionType]: ObservableMap<ViewportState>};

function initialState(): ViewportState {
  return {
    // virtual item information per rendered item
    items: [],
    // virtual dom item order to render
    start: 0,

    end: 0,

    // size of viewport in px
    virtualSize: 0,

    // total number of items
    realCount: 0
  };
}

const viewportStore: ViewportStore = {
  col: createStore(initialState()),
  colPinStart: createStore(initialState()),
  colPinEnd: createStore(initialState()),
  row: createStore(initialState()),
  rowPinStart: createStore(initialState()),
  rowPinEnd: createStore(initialState())
};

function getStoreByType(type: MultiDimensionType): ObservableMap<ViewportState> {
  return viewportStore[type];
}

function getItems(store: ObservableMap<ViewportState>): Pick<ViewportStateItems, 'items'|'start'|'end'> {
  return {
    items: store.get('items'),
    start: store.get('start'),
    end: store.get('end')
  };
}

function setViewport(data: Partial<ViewportState>, dimensionType: MultiDimensionType): void {
  const store: ObservableMap<ViewportState> = getStoreByType(dimensionType);
  setStore(store, data);
}

function setViewPortCoordinate(
    position: number,
    dimensionType: MultiDimensionType,
    dimension: DimensionDataViewport
): void {
  const store: ObservableMap<ViewportState> = getStoreByType(dimensionType);

  // no visible data to calculate
  if (!store.get('virtualSize')) {
    return;
  }

  const frameOffset: number = dimension.frameOffset;
  const outsize: number = frameOffset * 2 * dimension.originItemSize;
  const virtualSize = store.get('virtualSize') + outsize;

  let maxCoordinate: number = virtualSize;
  if (dimension.realSize > virtualSize) {
    maxCoordinate = dimension.realSize - virtualSize;
  }
  let pos: number = position;
  pos -= frameOffset * dimension.originItemSize;
  pos = pos < 0 ? 0 : pos < maxCoordinate  ? pos : maxCoordinate;


  const firstItem: VirtualPositionItem|undefined = getFirstItem(getItems(store));
  const lastItem: VirtualPositionItem|undefined = getLastItem(getItems(store));

  // left position changed
  if (!isActiveRange(pos, firstItem)) {
    const toUpdate = getUpdatedItemsByPosition(
      pos,
      getItems(store),
      store.get('realCount'),
      virtualSize,
      dimension
    );
    setStore(store, toUpdate);
    // right position changed
  } else if (firstItem && (store.get('virtualSize') + pos) > lastItem?.end) {
    // check is any item missing for full fill content
    const missing = addMissingItems(
        firstItem,
        store.get('realCount'),
        virtualSize + pos - firstItem.start,
        getItems(store),
        dimension
    );


    if (missing.length) {
      const items = [...store.get('items')];
      const range = {
        start: store.get('start'),
        end: store.get('end')
      };
      items.splice(range.end + 1, 0, ...missing);
      range.end += missing.length;

      if (range.start >= range.end) {
        range.start += missing.length;
      }
      setStore(store, {
        items: [...items],
        ...range
      });
    }
  }
}

function setViewPortDimension(sizes: ViewSettingSizeProp, dimensionType: MultiDimensionType): void {
  const store: ObservableMap<ViewportState> = getStoreByType(dimensionType);

  // viewport not inited
  if (!store.get('items').length) {
    return;
  }

  const items = store.get('items');
  let changedCoordinate: number = 0;

  for (let item of items) {
    let changedSize: number = 0;
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
      item.end = item.start + size;
    }
  }

  setStore(store, { items: [...items] });
}

export default viewportStore;

export {
  setViewport,
  setViewPortCoordinate,
  setViewPortDimension,
};
