import {
  DimensionDataViewport,
  addMissingItems,
  getFirstItem,
  getLastItem,
  getUpdatedItemsByPosition,
  isActiveRange,
  setItemSizes,
  updateMissingAndRange,
  isActiveRangeOutsideLastItem,
  ItemsToUpdate,
} from './viewport.helpers';
import { createStore } from '@stencil/store';
import { type Observable, setStore } from '../../utils/store.utils';
import type {
  VirtualPositionItem,
  ViewportState,
  MultiDimensionType,
} from '@type';

/**
 * Viewport store
 * Used for virtualization (process of rendering only visible part of data)
 * Redraws viewport based on position and dimension
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
export class ViewportStore {
  readonly store: Observable<ViewportState>;

  // last coordinate for store position restore
  private lastKnownScroll = 0;

  get lastCoordinate() {
    return this.lastKnownScroll;
  }
  set lastCoordinate(value: number) {
    this.lastKnownScroll = value;
  }
  constructor(readonly type: MultiDimensionType) {
    this.store = createStore(initialState());
  }

  /**
   * Render viewport based on coordinate
   * It's the main method for draw
   * Use force if you want to re-render viewport
   */
  setViewPortCoordinate(
    position: number,
    dimension: DimensionDataViewport,
    force = false,
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

    let allItems: ItemsToUpdate;
    // if force clear all items and start from 0
    if (force) {
      allItems = {
        items: [],
        start: 0,
        end: 0,
      };
    } else {
      allItems = this.getItems();
    }

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
      const items = [...allItems.items];
      // check is any item missing for fulfill content
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

  getItems(): ItemsToUpdate {
    return {
      items: this.store.get('items'),
      start: this.store.get('start'),
      end: this.store.get('end'),
    };
  }

  setViewport(data: Partial<ViewportState>) {
    // drop items on virtual size change, require a new item set
    // drop items on real size change, require a new item set
    if (typeof data.realCount === 'number' || typeof data.virtualSize === 'number') {
      data = { ...data, items: data.items || [] };
    }
    setStore(this.store, data);
  }
}
