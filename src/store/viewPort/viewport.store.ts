/**
 * Viewport store
 * Used for virtualization (process of rendering only visible part of data)
 * Redraws viewport based on position and dimension
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
  isActiveRangeOutsideLastItem,
} from './viewport.helpers';

import { setStore } from '../../utils/store.utils';
import type {
  VirtualPositionItem,
  ViewportStateItems,
  ViewportState,
  Observable,
  ViewSettingSizeProp,
} from '../../types/interfaces';
import type { MultiDimensionType } from '../../types/dimension';

export type ViewportStoreCollection = {
  [T in MultiDimensionType]: ViewportStore;
};

/**
 * Initial state for viewport store
 */
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
    realCount: 0,
  };
}

/**
 * Viewport store class
 */
export default class ViewportStore {
  readonly store: Observable<ViewportState>;
  // last coordinate for store position restore
  private lastKnownScroll = 0;
  get lastCoordinate() {
    return this.lastKnownScroll;
  }
  private set lastCoordinate(value: number) {
    this.lastKnownScroll = value;
  }
  constructor(readonly type: MultiDimensionType) {
    this.store = createStore(initialState());
    // drop items on real size change, require a new item set
    this.store.onChange('realCount', () => this.clearItems());
    // drop items on virtual size change, require a new item set
    this.store.onChange('virtualSize', () => this.clearItems());
  }

  /**
   * Render viewport based on coordinate
   * It's the main method for draw
   */
  setViewPortCoordinate(
    position: number,
    dimension: DimensionDataViewport,
  ) {
    const viewportSize = this.store.get('virtualSize');
    // no visible data to calculate
    if (!viewportSize) {
      return;
    }

    const frameOffset = 1;
    const singleOffsetInPx = dimension.originItemSize * frameOffset;
    // add offset to virtual size from both sides
    const outsize = singleOffsetInPx * 2;
    // math virtual size is based on visible area + 2 items outside of visible area
    const virtualSize = viewportSize + outsize;

    // expected no scroll if real size less than virtual size, position is 0
    let maxCoordinate = 0;
    // if there is nodes outside of viewport, max coordinate has to be adjusted
    if (dimension.realSize > viewportSize) {
      // max coordinate is real size minus virtual/rendered space
      maxCoordinate = dimension.realSize - viewportSize - singleOffsetInPx;
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

    // actual position is less than first item start based on offset
    pos -= singleOffsetInPx;
    pos = pos < 0 ? 0 : pos < maxCoordinate ? pos : maxCoordinate;

    const allItems = this.getItems();
    const items = [...allItems.items];

    const firstItem: VirtualPositionItem | undefined = getFirstItem(allItems);
    const lastItem: VirtualPositionItem | undefined = getLastItem(allItems);

    let toUpdate: Partial<ViewportState> = {};

    // left position changed
    // verify if new position is in range of previously rendered first item
    if (!isActiveRange(pos, dimension.realSize, firstItem, lastItem)) {
      toUpdate = {
        ...toUpdate,
        ...getUpdatedItemsByPosition(
          pos,
          allItems,
          this.store.get('realCount'),
          virtualSize,
          dimension,
        ),
      };
      this.setViewport({ ...toUpdate });
      // verify is render area is outside of last item
    } else if (
      isActiveRangeOutsideLastItem(pos, virtualSize, firstItem, lastItem)
    ) {
      // check is any item missing for full fill content
      const missing = addMissingItems(
        firstItem,
        this.store.get('realCount'),
        virtualSize + pos - firstItem.start,
        allItems,
        {
          sizes: dimension.sizes,
          originItemSize: dimension.originItemSize,
        },
      );

      // update missing items
      if (missing.length) {
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
        this.setViewport({ ...toUpdate });
      }
    }
  }

  /**
   * Update viewport sizes for existing items
   * This method is generating new item positions based on custom sizes and original sizes
   * @param sizes - custom sizes for each item
   * @param dropToOriginalSize - drop to original size if requested
   */
  setViewPortDimensionSizes(
    sizes: ViewSettingSizeProp,
    dropToOriginalSize?: number,
  ) {
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
      const allItems = this.getItems();
      const firstItem: VirtualPositionItem | undefined = getFirstItem(allItems);
      items = setItemSizes(items, start, dropToOriginalSize, firstItem.start);
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

    this.setViewport({ items: [...items] });
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
      items: setItemSizes(
        items,
        this.store.get('start'),
        size,
        this.lastCoordinate,
      ),
    });
  }

  getItems(): Pick<ViewportStateItems, 'items' | 'start' | 'end'> {
    return {
      items: this.store.get('items'),
      start: this.store.get('start'),
      end: this.store.get('end'),
    };
  }

  setViewport(data: Partial<ViewportState>) {
    setStore(this.store, data);
  }

  clearItems() {
    this.store.set('items', []);
  }
}
