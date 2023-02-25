import { getItemByPosition } from '../dimension/dimension.helpers';
import { RevoGrid } from '../../interfaces';

export type DimensionDataViewport = Pick<
  RevoGrid.DimensionSettingsState,
  'indexes' | 'positionIndexes' | 'positionIndexToItem' | 'sizes' | 'originItemSize' | 'realSize'
>;

type ItemsToUpdate = Pick<RevoGrid.ViewportStateItems, 'items' | 'start' | 'end'>;
/**
 * Update items based on new scroll position
 * If viewport wasn't changed fully simple recombination of positions
 * Otherwise rebuild viewport items
 */
export function getUpdatedItemsByPosition<T extends ItemsToUpdate>(
  pos: number, // coordinate
  items: T,
  realCount: number,
  virtualSize: number,
  dimension: DimensionDataViewport
): ItemsToUpdate {
  const activeItem: RevoGrid.PositionItem = getItemByPosition(dimension, pos);
  const firstItem: RevoGrid.VirtualPositionItem = getFirstItem(items);
  let toUpdate: ItemsToUpdate;
  // do simple position recombination if items already present in viewport
  if (firstItem) {
    let changedOffsetStart = activeItem.itemIndex - (firstItem.itemIndex || 0);
    // if item changed
    if (changedOffsetStart) {
      // simple recombination
      toUpdate = recombineByOffset(Math.abs(changedOffsetStart), {
        positiveDirection: changedOffsetStart > -1,
        ...dimension,
        ...items,
      });
    }
  }

  // if partial recombination add items if revo-viewport has some space left
  if (toUpdate) {
    const extra = addMissingItems(activeItem, realCount, virtualSize, toUpdate, dimension);
    if (extra.length) {
      updateMissingAndRange(toUpdate.items, extra, toUpdate);
    }
  }

  // new collection if no items after replacement full replacement
  if (!toUpdate) {
    const items = getItems({
      firstItemStart: activeItem.start,
      firstItemIndex: activeItem.itemIndex,
      origSize: dimension.originItemSize,
      // virtual size can differ based on scroll position if some big items are present
      // scroll can be in the middle of item and virtual size will be larger
      // so we need to exclude this part from virtual size hence it's already passed
      maxSize: Math.min(virtualSize + (activeItem.end - activeItem.start), dimension.realSize),
      maxCount: realCount,
      sizes: dimension.sizes,
    });

    // range now comes from 0 to length - 1
    toUpdate = {
      items,
      start: 0,
      end: items.length - 1,
    };
  }
  return toUpdate;
}

export function updateMissingAndRange(
  items: RevoGrid.VirtualPositionItem[],
  missing: RevoGrid.VirtualPositionItem[],
  range: RevoGrid.Range
) {
  items.splice(range.end + 1, 0, ...missing);
  // update range if start larger after recombination
  if (range.start >= range.end && !(range.start === range.end && range.start === 0)) {
    range.start += missing.length;
  }
  range.end += missing.length;
}

/**
 * If partial replacement
 * this function adds items if viewport has some space left
 */
export function addMissingItems<T extends ItemsToUpdate>(
  firstItem: RevoGrid.PositionItem,
  realCount: number,
  virtualSize: number,
  existingCollection: T,
  dimension: Pick<RevoGrid.DimensionSettingsState, 'sizes' | 'originItemSize'>,
): RevoGrid.VirtualPositionItem[] {
  const lastItem: RevoGrid.VirtualPositionItem = getLastItem(existingCollection);
  const items = getItems({
    sizes: dimension.sizes,
    firstItemStart: lastItem.end,
    firstItemIndex: lastItem.itemIndex + 1,
    origSize: dimension.originItemSize,
    maxSize: virtualSize - (lastItem.end - firstItem.start),
    maxCount: realCount,
  });
  return items;
}

/**
 * Get wiewport items parameters
 * caching position and calculating items count in viewport
 */
export function getItems(
  opt: {
    firstItemIndex: number;
    firstItemStart: number;
    origSize: number;
    maxSize: number; // virtual size
    maxCount: number; // real item count, where the last item
    sizes?: RevoGrid.ViewSettingSizeProp;
  },
  currentSize = 0,
) {
  const items: RevoGrid.VirtualPositionItem[] = [];

  let index = opt.firstItemIndex;
  let size = currentSize;

  // max size or max count
  while (size <= opt.maxSize && index < opt.maxCount) {
    const newSize = getItemSize(index, opt.sizes, opt.origSize);
    items.push({
      start: opt.firstItemStart + size,
      end: opt.firstItemStart + size + newSize,
      itemIndex: index,
      size: newSize,
    });
    size += newSize;
    index++;
  }
  return items;
}

/**
 * Do batch items recombination
 * If items not overlapped with existing viewport returns null
 */
type RecombindDimensionData = Pick<RevoGrid.DimensionSettingsState, 'sizes' | 'realSize' | 'originItemSize'>;
type RecombineOffsetData = {
  positiveDirection: boolean;
} & ItemsToUpdate & RecombindDimensionData;
export function recombineByOffset(
  offset: number,
  data: RecombineOffsetData
): ItemsToUpdate | null {
  const newItems = [...data.items];
  const itemsCount = newItems.length;
  let newRange = {
    start: data.start,
    end: data.end,
  };

  // if offset out of revo-viewport, makes sense whole redraw
  if (offset > itemsCount) {
    return null;
  }

  // is direction of scroll positive
  if (data.positiveDirection) {
    // push item to the end
    let lastItem: RevoGrid.VirtualPositionItem = getLastItem(data);

    let i: number = newRange.start;
    const length = i + offset;
    for (; i < length; i++) {
      const newIndex: number = lastItem.itemIndex + 1;
      const size: number = getItemSize(newIndex, data.sizes, data.originItemSize);

      // if item overlapped limit break a loop
      if (lastItem.end + size > data.realSize) {
        break;
      }

      // new item index to recombine
      let newEnd = i % itemsCount;

      // item should always present, we do not create new item, we recombine them
      if (!newItems[newEnd]) {
        throw new Error('incorrect index');
      }

      // do recombination
      newItems[newEnd] = lastItem = {
        start: lastItem.end,
        end: lastItem.end + size,
        itemIndex: newIndex,
        size: size,
      };
      // update range
      newRange.start++;
      newRange.end = newEnd;
    }

    // direction is negative
  } else {
    // push item to the start
    let firstItem: RevoGrid.VirtualPositionItem = getFirstItem(data);

    const end = newRange.end;
    for (let i = 0; i < offset; i++) {
      const newIndex: number = firstItem.itemIndex - 1;
      const size: number = getItemSize(newIndex, data.sizes, data.originItemSize);

      // new item index to recombine
      let newStart = end - i;
      newStart = (newStart < 0 ? itemsCount + newStart : newStart) % itemsCount;

      // item should always present, we do not create new item, we recombine them
      if (!newItems[newStart]) {
        throw new Error('incorrect index');
      }

      // do recombination
      newItems[newStart] = firstItem = {
        start: firstItem.start - size,
        end: firstItem.start,
        itemIndex: newIndex,
        size: size,
      };
      // update range
      newRange.start = newStart;
      newRange.end--;
    }
  }
  const range = {
    start: (newRange.start < 0 ? itemsCount + newRange.start : newRange.start) % itemsCount,
    end: (newRange.end < 0 ? itemsCount + newRange.end : newRange.end) % itemsCount,
  };
  return {
    items: newItems,
    ...range,
  };
}

function getItemSize(index: number, sizes?: RevoGrid.ViewSettingSizeProp, origSize: number = 0): number {
  if (sizes && sizes[index]) {
    return sizes[index];
  }
  return origSize;
}

export function isActiveRange(pos: number, item: RevoGrid.PositionItem | undefined): boolean {
  return item && pos >= item.start && pos <= item.end;
}

export function getFirstItem(s: ItemsToUpdate): RevoGrid.VirtualPositionItem | undefined {
  return s.items[s.start];
}

export function getLastItem(s: ItemsToUpdate): RevoGrid.VirtualPositionItem {
  return s.items[s.end];
}

/**
 * Set items sizes from start index to end
 * @param vpItems 
 * @param start 
 * @param size 
 * @param lastCoordinate 
 * @returns 
 */
export function setItemSizes(
  vpItems: RevoGrid.VirtualPositionItem[],
  initialIndex: number,
  size: number,
  lastCoordinate: number
) {
  const items = [...vpItems];
  const count = items.length;

  let pos = lastCoordinate;
  let i = 0;
  let start = initialIndex;

  // viewport not inited
  if (!count) {
    return [];
  }
   // loop through array from initial item after recombination
   while (i < count) {
    const item = items[start];
    item.start = pos;
    item.size = size;
    item.end = item.start + size;
    pos = item.end;
    // loop by start index
    start++;
    i++;

    // if start index out of array, reset it
    if (start === count) {
      start = 0;
    }
  }
  return items;
}
