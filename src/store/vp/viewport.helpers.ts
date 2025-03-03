import type {
  DimensionSettingsState,
  PositionItem,
  ViewSettingSizeProp,
  ViewportStateItems,
  VirtualPositionItem,
  Range,
} from '@type';

import { getItemByPosition } from '../dimension/dimension.helpers';

export type DimensionDataViewport = Pick<
  DimensionSettingsState,
  | 'indexes'
  | 'positionIndexes'
  | 'positionIndexToItem'
  | 'sizes'
  | 'originItemSize'
  | 'realSize'
>;

export type ItemsToUpdate = Pick<ViewportStateItems, 'items' | 'start' | 'end'>;
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
  dimension: DimensionDataViewport,
): ItemsToUpdate {
  const activeItem: PositionItem = getItemByPosition(dimension, pos);
  const firstItem = getFirstItem(items);
  let toUpdate: ItemsToUpdate | undefined;
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

  const maxSizeVirtualSize = getMaxVirtualSize(
    virtualSize,
    dimension.realSize,
    activeItem,
  );
  // if partial recombination add items if revo-viewport has some space left
  if (toUpdate) {
    const extra = addMissingItems(
      activeItem,
      realCount,
      maxSizeVirtualSize,
      toUpdate,
      dimension,
    );
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
      maxSize: maxSizeVirtualSize,
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

// virtual size can differ based on scroll position if some big items are present
// scroll can be in the middle of item and virtual size will be larger
// so we need to exclude this part from virtual size hence it's already passed
function getMaxVirtualSize(
  virtualSize: number,
  realSize: number,
  activeItem: PositionItem,
) {
  return Math.min(virtualSize + (activeItem.end - activeItem.start), realSize);
}

export function updateMissingAndRange(
  items: VirtualPositionItem[],
  missing: VirtualPositionItem[],
  range: Range,
) {
  items.splice(range.end + 1, 0, ...missing);
  // update range if start larger after recombination
  if (
    range.start >= range.end &&
    !(range.start === range.end && range.start === 0)
  ) {
    range.start += missing.length;
  }
  range.end += missing.length;
}

/**
 * If partial replacement
 * this function adds items if viewport has some space left
 */
export function addMissingItems<T extends ItemsToUpdate>(
  firstItem: PositionItem,
  realCount: number,
  virtualSize: number,
  existingCollection: T,
  dimension: Pick<DimensionSettingsState, 'sizes' | 'originItemSize'>,
): VirtualPositionItem[] {
  const lastItem: VirtualPositionItem = getLastItem(existingCollection);
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
    sizes?: ViewSettingSizeProp;
  },
  currentSize = 0,
) {
  const items: VirtualPositionItem[] = [];

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
type RecombindDimensionData = Pick<
  DimensionSettingsState,
  'sizes' | 'realSize' | 'originItemSize'
>;
type RecombineOffsetData = {
  positiveDirection: boolean;
} & ItemsToUpdate &
  RecombindDimensionData;
export function recombineByOffset(
  offset: number,
  data: RecombineOffsetData,
): ItemsToUpdate | undefined {
  const newItems = [...data.items];
  const itemsCount = newItems.length;
  let newRange = {
    start: data.start,
    end: data.end,
  };

  // if offset out of revo-viewport, makes sense whole redraw
  if (offset > itemsCount) {
    return undefined;
  }

  // is direction of scroll positive
  if (data.positiveDirection) {
    // push item to the end
    let lastItem: VirtualPositionItem = getLastItem(data);

    let i = newRange.start;
    const length = i + offset;
    for (; i < length; i++) {
      const newIndex = lastItem.itemIndex + 1;
      const size = getItemSize(
        newIndex,
        data.sizes,
        data.originItemSize,
      );

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
    let firstItem = getFirstItem(data);

    const end = newRange.end;
    for (let i = 0; i < offset; i++) {
      const newIndex = (firstItem?.itemIndex ?? 0) - 1;
      const size = getItemSize(
        newIndex,
        data.sizes,
        data.originItemSize,
      );

      // new item index to recombine
      let newStart = end - i;
      newStart = (newStart < 0 ? itemsCount + newStart : newStart) % itemsCount;

      // item should always present, we do not create new item, we recombine them
      if (!newItems[newStart]) {
        console.error('incorrect index');
        break;
      }

      // do recombination
      const firstItemStart = firstItem?.start ?? 0;
      newItems[newStart] = firstItem = {
        start: firstItemStart - size,
        end: firstItemStart,
        itemIndex: newIndex,
        size: size,
      };
      // update range
      newRange.start = newStart;
      newRange.end--;
    }
  }
  const range = {
    start:
      (newRange.start < 0 ? itemsCount + newRange.start : newRange.start) %
      itemsCount,
    end:
      (newRange.end < 0 ? itemsCount + newRange.end : newRange.end) %
      itemsCount,
  };
  return {
    items: newItems,
    ...range,
  };
}

function getItemSize(
  index: number,
  sizes?: ViewSettingSizeProp,
  origSize = 0,
): number {
  if (sizes && sizes[index]) {
    return sizes[index];
  }
  return origSize;
}

/**
 * Verify if position is in range of the PositionItem, start and end are included
 */
export function isActiveRange(
  pos: number,
  realSize: number,
  first?: PositionItem,
  last?: PositionItem,
): boolean {
  if (!first || !last) {
    return false;
  }
  // if position is in range of first item
  // or position is after first item and last item is the last item in real size
  return (
    (pos >= first.start && pos <= first.end) ||
    (pos > first.end && last.end === realSize)
  );
}

export function isActiveRangeOutsideLastItem(
  pos: number,
  virtualSize: number,
  firstItem?: PositionItem,
  lastItem?: PositionItem,
) {
  // if no first item, means no items in viewport
  if (!firstItem) {
    return false;
  }
  return virtualSize + pos > (lastItem?.end ?? 0);
}

export function getFirstItem(
  s: ItemsToUpdate,
) {
  return s.items[s.start];
}

export function getLastItem(s: ItemsToUpdate): VirtualPositionItem {
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
  vpItems: VirtualPositionItem[],
  initialIndex: number,
  size: number,
  lastCoordinate: number,
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
