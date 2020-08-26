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
  isActiveRange, updateMissing
} from './viewport.helpers';

import {setStore} from '../../utils/store.utils';
import {
  ViewportState,
  ViewportStateItems, ViewSettingSizeProp,
  VirtualPositionItem
} from '../../interfaces';


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

export default class ViewportStore {
  readonly store: ObservableMap<ViewportState>;
  constructor() {
    this.store = createStore(initialState());
  }

  getItems(): Pick<ViewportStateItems, 'items'|'start'|'end'> {
    return {
      items: this.store.get('items'),
      start: this.store.get('start'),
      end: this.store.get('end')
    };
  }

  setViewport(data: Partial<ViewportState>): void {
    setStore(this.store, data);
  }

  setViewPortCoordinate(
      position: number,
      dimension: DimensionDataViewport
  ): void {
    // no visible data to calculate
    if (!this.store.get('virtualSize')) {
      return;
    }

    const frameOffset: number = dimension.frameOffset;
    const outsize: number = frameOffset * 2 * dimension.originItemSize;
    const virtualSize = this.store.get('virtualSize') + outsize;

    let maxCoordinate: number = virtualSize;
    if (dimension.realSize > virtualSize) {
      maxCoordinate = dimension.realSize - virtualSize;
    }
    let pos: number = position;
    pos -= frameOffset * dimension.originItemSize;
    pos = pos < 0 ? 0 : pos < maxCoordinate  ? pos : maxCoordinate;


    const firstItem: VirtualPositionItem|undefined = getFirstItem(this.getItems());
    const lastItem: VirtualPositionItem|undefined = getLastItem(this.getItems());

    // left position changed
    if (!isActiveRange(pos, firstItem)) {
      const toUpdate = getUpdatedItemsByPosition(
          pos,
          this.getItems(),
          this.store.get('realCount'),
          virtualSize,
          dimension
      );
      setStore(this.store, toUpdate);
      // right position changed
    } else if (firstItem && (this.store.get('virtualSize') + pos) > lastItem?.end) {
      // check is any item missing for full fill content
      const missing = addMissingItems(
          firstItem,
          this.store.get('realCount'),
          virtualSize + pos - firstItem.start,
          this.getItems(),
          dimension
      );


      if (missing.length) {
        const items = [...this.store.get('items')];
        const range = {
          start: this.store.get('start'),
          end: this.store.get('end')
        };
        updateMissing(items, missing, range);
        setStore(this.store, {
          items: [...items],
          ...range
        });
      }
    }
  }

  setViewPortDimension(sizes: ViewSettingSizeProp): void {
    // viewport not inited
    if (!this.store.get('items').length) {
      return;
    }

    const items = this.store.get('items');
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

    setStore(this.store, { items: [...items] });
  }
}
