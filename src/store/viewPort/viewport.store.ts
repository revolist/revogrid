/**
 * Store is responsible for visible
 * Viewport information for each dimension
 * Redraw items during scrolling
 */

import { createStore } from '@stencil/store';

import {
  addMissingItems,
  DimensionDataViewport,
  getFirstItem,
  getLastItem,
  getUpdatedItemsByPosition,
  isActiveRange,
  setItemSizes,
  updateMissingAndRange,
} from './viewport.helpers';

import { setStore } from '../../utils/store.utils';
import { Observable, RevoGrid } from '../../interfaces';

function initialState(): RevoGrid.ViewportState {
  return {
    // virtual item information per rendered item
    items: [],
    // virtual dom item order to render
    start: 0,

    end: 0,

    // size of viewport in px
    virtualSize: 0,

    // total number of items
    realCount: 0,
  };
}

export default class ViewportStore {
  readonly store: Observable<RevoGrid.ViewportState>;
  // last coordinate for store position restore
  private lastKnownScroll = 0;
  get lastCoordinate() {
    return this.lastKnownScroll;
  }
  private set lastCoordinate(value: number) {
    this.lastKnownScroll = value;
  }
  constructor(readonly type: RevoGrid.MultiDimensionType) {
    this.store = createStore(initialState());
    this.store.onChange('realCount', () => this.clearItems());
    // drop items on virtual size change, require a new item set
    this.store.onChange('virtualSize', () => this.setViewport({ items: [] }));
  }

  /**
   * Render viewport based on coordinate
   * It's the main method for draw
   */
  setViewPortCoordinate(position: number, dimension: DimensionDataViewport) {
    let virtualSize = this.store.get('virtualSize');
    // no visible data to calculate
    if (!virtualSize) {
      return;
    }

    const frameOffset = 1;
    const outsize = frameOffset * 2 * dimension.originItemSize;
    // math virtual size is based on visible area + 2 items outside of visible area
    virtualSize += outsize;

    // max possible coordinate is real size - virtual size
    // or virtualSize if real size is less
    let maxCoordinate = virtualSize;
    if (dimension.realSize > virtualSize) {
      maxCoordinate = dimension.realSize - virtualSize;
    }

    let pos = position;
    // limit position to max and min coordinates
    if (pos < 0) {
      pos = 0;
    } else if (pos > maxCoordinate) {
      pos = maxCoordinate;
    }

    // store last coordinate for further restore on redraw
    this.lastCoordinate = pos;

    // actual position is less then first item start based on offset
    pos -= frameOffset * dimension.originItemSize;
    pos = pos < 0 ? 0 : pos < maxCoordinate ? pos : maxCoordinate;

    const firstItem = getFirstItem(this.getItems());
    const lastItem = getLastItem(this.getItems());

    let toUpdate: Partial<RevoGrid.ViewportState> = {};
    // left position changed
    if (!isActiveRange(pos, firstItem)) {
      toUpdate = {
        ...toUpdate,
        ...getUpdatedItemsByPosition(pos, this.getItems(), this.store.get('realCount'), virtualSize, dimension),
      };
      setStore(this.store, { ...toUpdate });
      // right position changed
    } else if (firstItem && this.store.get('virtualSize') + pos > lastItem?.end) {
      // check is any item missing for full fill content
      const missing = addMissingItems(firstItem, this.store.get('realCount'), virtualSize + pos - firstItem.start, this.getItems(), dimension);

      if (missing.length) {
        const items = [...this.store.get('items')];
        const range = {
          start: this.store.get('start'),
          end: this.store.get('end'),
        };
        updateMissingAndRange(items, missing, range);
        toUpdate = {
          ...toUpdate,
          items: [...items],
          ...range,
        };
        setStore(this.store, { ...toUpdate });
      }
    }
  }

  /**
   * Update viewport sizes for existing items
   * This method is generating new item positions based on custom sizes and original sizes
   * @param sizes - custom sizes for each item
   * @param dropToOriginalSize - drop to original size if requested
   */
  setViewPortDimensionSizes(sizes: RevoGrid.ViewSettingSizeProp, dropToOriginalSize?: number) {
    let items = [...this.store.get('items')];
    const count = items.length;
    // viewport not inited
    if (!count) {
      return;
    }

    let changedCoordinate = 0;
    let i = 0;
    let start = this.store.get('start');

    // drop to original size if requested
    if (dropToOriginalSize) {
      items = setItemSizes(items, start, dropToOriginalSize, this.lastCoordinate);
    }

    // loop through array from initial item after recombination
    // if size change present, change position for all items after
    while (i < count) {
      const item = items[start];
      // change pos if size change present before
      if (changedCoordinate) {
        item.start += changedCoordinate;
        item.end += changedCoordinate;
      }
      // check if size change present
      const size: number | undefined = sizes[item.itemIndex];
      // size found
      if (size) {
        const changedSize = size - item.size;
        changedCoordinate += changedSize;
        item.size = size;
        item.end = item.start + size;
        // size lost
      }

      // loop by start index
      start++;
      i++;
      // if start index out of array, reset it
      if (start === count) {
        start = 0;
      }
    }

    setStore(this.store, { items: [...items] });
  }

  /**
   * Set sizes for existing items
   */
  setOriginalSizes(size: number) {
    const items = this.store.get('items');
    const count = items.length;
    // viewport not inited
    if (!count) {
      return;
    }

    setStore(this.store, {
      items: setItemSizes(items, this.store.get('start'), size, this.lastCoordinate),
    });
  }

  getItems(): Pick<RevoGrid.ViewportStateItems, 'items' | 'start' | 'end'> {
    return {
      items: this.store.get('items'),
      start: this.store.get('start'),
      end: this.store.get('end'),
    };
  }

  setViewport(data: Partial<RevoGrid.ViewportState>) {
    setStore(this.store, data);
  }

  clearItems() {
    this.store.set('items', []);
  }
}
