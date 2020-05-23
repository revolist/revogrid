import sortedIndex from 'lodash/sortedIndex';
import {range} from '../utils/utils';
import {
  DimensionSettingsState,
  PositionItem,
  ViewportStateItems,
  ViewSettingSizeProp,
  VirtualPositionItem
} from "../interfaces";

/**
* Update items based on new scroll position
* If viewport wasn't changed fully simple recombination of positions
* Otherwise rebuild viewport items
*/
export function getUpdatedItemsByPosition(
  pos: number,
  items: ViewportStateItems,
  realCount: number,
  virtualSize: number,
  dimension: DimensionSettingsState
): ViewportStateItems {
  const activeItem: PositionItem = getOffset(dimension, pos, dimension.originItemSize);
  const firstItem: VirtualPositionItem = getFirstItem(items);
  let toUpdate: ViewportStateItems;

  // do simple position replacement if items already present in viewport
  if (firstItem) {
    let changedOffsetStart: number = activeItem.itemIndex - (firstItem.itemIndex || 0);
    if (changedOffsetStart) {
      // try todo simple recombination
      const newData: ViewportStateItems|null = recombineByOffset({
        newItem: activeItem,
        prevItem: firstItem,
        dimension: dimension,
        positiveDirection: changedOffsetStart > -1,
        offset: Math.abs(changedOffsetStart)
      }, items);

      if (newData) {
        toUpdate = newData;
      }

      // if partial replacement add items if revo-viewport has some space left
      if (toUpdate) {
        const extra: ViewportStateItems = addMissingItems(activeItem, realCount, virtualSize, toUpdate, dimension);
        if (extra.items.length) {
          toUpdate.items.push(...extra.items);
          toUpdate.itemIndexes.push(...extra.itemIndexes);
        }
      }
    }
  }

  // new collection if no items after replacement full replacement
  if (!toUpdate) {
    toUpdate = getItems({
      sizes: dimension.sizes,
      start: activeItem.start,
      startIndex: activeItem.itemIndex,
      origSize: dimension.originItemSize,
      maxSize: virtualSize,
      maxCount: realCount
    });
  }
  return toUpdate;
}

// if partial replacement add items if revo-viewport has some space left
export function addMissingItems(
  firstItem: PositionItem,
  realCount: number,
  virtualSize: number,
  existingCollection: ViewportStateItems,
  dimension: DimensionSettingsState
): ViewportStateItems {
  const lastItem: VirtualPositionItem = getLastItem(existingCollection);
  const data = getItems({
    sizes: dimension.sizes,
    start: lastItem.end,
    startIndex: lastItem.itemIndex + 1,
    origSize: dimension.originItemSize,
    maxSize: virtualSize - (lastItem.end - firstItem.start),
    maxCount: realCount - 1 - lastItem.itemIndex
  });
  return {
    items: data.items,
    itemIndexes: range(data.items.length, existingCollection.items.length)
  };
}

// get first item in revo-viewport
function getOffset(dimension: DimensionSettingsState, pos: number, origSize: number): PositionItem {
  const item: PositionItem = {
    itemIndex: 0,
    start: 0,
    end: 0
  };
  const currentPlace: number = dimension.indexes.length ? sortedIndex(dimension.positionIndexes, pos) : 0;
  // not found or first index
  if (!currentPlace) {
    item.itemIndex = Math.floor(pos/origSize);
    item.start = item.itemIndex * origSize;
    item.end = item.start + origSize;
    return item;
  }
  const positionItem: PositionItem = dimension.positionIndexToCoordinate[currentPlace - 1];
  // if item has specified size
  if (positionItem.end > pos) {
    return positionItem;
  }
  // special size item was present before
  const relativePos: number = pos - positionItem.end;
  const relativeIndex: number = Math.floor(relativePos/origSize);
  item.itemIndex = positionItem.itemIndex + 1 + relativeIndex;
  item.start = positionItem.end + relativeIndex * origSize;
  item.end = item.start + origSize;
  return item;
}

// get revo-viewport items parameters, caching position and calculating items count in revo-viewport
function getItems(opt: {
  sizes: ViewSettingSizeProp,
  startIndex: number,
  start: number,
  origSize: number,
  maxSize: number,
  maxCount: number
}, currentSize: number = 0): ViewportStateItems {
  const items: VirtualPositionItem[] = [];
  const itemIndexes: number[] = [];
  let index: number = opt.startIndex;
  let size: number = currentSize;
  let i: number = 0;
  while(size <= opt.maxSize && i < opt.maxCount) {
    const newSize: number = getItemSize(index, opt.sizes, opt.origSize);
    itemIndexes.push(i);
    items.push({
      start: opt.start + size,
      end: opt.start + size + newSize,
      itemIndex: index,
      size: newSize
    });
    size += newSize;
    index++;
    i++;
  }
  return {items, itemIndexes};
}


/**
* Do batch items recombination
* If items not overlapped with existing viewport returns null
*/
function recombineByOffset(data: {
  newItem: PositionItem,
  prevItem: PositionItem,
  offset: number,
  positiveDirection: boolean,
  dimension: DimensionSettingsState
}, state: ViewportStateItems): ViewportStateItems|null {
  const indexSize = state.itemIndexes.length;

  // if offset out of revo-viewport, makes sense whole redraw
  if (data.offset > indexSize) {
    return null;
  }
  if (data.positiveDirection) {
    let lastItem: VirtualPositionItem = getLastItem(state);
    for (let i: number = 0; i < data.offset; i++) {
      const newIndex: number = lastItem.itemIndex + 1;
      const size: number = getItemSize(newIndex, data.dimension.sizes, data.dimension.originItemSize);

      // if item overlapped limit break a loop
      if (lastItem.end + size > data.dimension.realSize) {
        break;
      }

      state.items[state.itemIndexes[i]] = lastItem = {
        itemIndex: newIndex,
        start: lastItem.end,
        end: lastItem.end + size,
        size: size
      };

    }
    // push item to the end
    state.itemIndexes.push(...state.itemIndexes.splice(0, data.offset));
  } else {
    const changed: number = indexSize - data.offset;
    let firstItem: VirtualPositionItem =  getFirstItem(state);
    for (let i: number = indexSize - 1; i >= changed; i--) {
      const newIndex: number = firstItem.itemIndex - 1;
      const size: number = getItemSize(newIndex, data.dimension.sizes, data.dimension.originItemSize);
      state.items[state.itemIndexes[i]] = firstItem = {
        itemIndex: newIndex,
        start: firstItem.start - size,
        end: firstItem.start,
        size: size
      };
    }
    // push item to the start
    state.itemIndexes.unshift(...state.itemIndexes.splice(changed, indexSize - 1));
  }
  return {
    items: [...state.items],
    itemIndexes: [...state.itemIndexes]
  };
}

function getItemSize(index: number, sizes: ViewSettingSizeProp, origSize: number): number {
  if (sizes[index]) {
    return sizes[index];
  }
  return origSize;
}

function isActiveRange(pos: number, item: PositionItem|undefined): boolean {
  return item && pos >= item.start && pos <= item.end;
}

function getFirstItem(s: ViewportStateItems): VirtualPositionItem|undefined {
  return s.items[s.itemIndexes[0]];
}

function getLastItem(s: ViewportStateItems): VirtualPositionItem {
  return s.items[s.itemIndexes[s.itemIndexes.length - 1]];
}

export {
  isActiveRange,
  getFirstItem,
  getLastItem
};

