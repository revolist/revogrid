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
export function getUpdatedItemsByPosition<T extends ItemsToUpdate>(pos: number, items: T, realCount: number, virtualSize: number, dimension: DimensionDataViewport): ItemsToUpdate {
  const activeItem: RevoGrid.PositionItem = getItemByPosition(dimension, pos);
  const firstItem: RevoGrid.VirtualPositionItem = getFirstItem(items);
  let toUpdate: ItemsToUpdate;

  // do simple position replacement if items already present in viewport
  if (firstItem) {
    let changedOffsetStart: number = activeItem.itemIndex - (firstItem.itemIndex || 0);
    if (changedOffsetStart) {
      // simple recombination
      const newData: ItemsToUpdate | null = recombineByOffset(Math.abs(changedOffsetStart), {
        positiveDirection: changedOffsetStart > -1,
        ...dimension,
        ...items,
      });

      if (newData) {
        toUpdate = newData;
      }

      // if partial replacement add items if revo-viewport has some space left
      if (toUpdate) {
        const extra = addMissingItems(activeItem, realCount, virtualSize, toUpdate, dimension);
        if (extra.length) {
          updateMissingAndRange(toUpdate.items, extra, toUpdate);
        }
      }
    }
  }

  // new collection if no items after replacement full replacement
  if (!toUpdate) {
    const items = getItems({
      start: activeItem.start,
      startIndex: activeItem.itemIndex,
      origSize: dimension.originItemSize,
      maxSize: virtualSize,
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

export function updateMissingAndRange(items: RevoGrid.VirtualPositionItem[], missing: RevoGrid.VirtualPositionItem[], range: RevoGrid.Range) {
  items.splice(range.end + 1, 0, ...missing);
  // update range if start larger after recombination
  if (range.start >= range.end && !(range.start === range.end && range.start === 0)) {
    range.start += missing.length;
  }
  range.end += missing.length;
}

// if partial replacement add items if revo-viewport has some space left
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
    start: lastItem.end,
    startIndex: lastItem.itemIndex + 1,
    origSize: dimension.originItemSize,
    maxSize: virtualSize - (lastItem.end - firstItem.start),
    maxCount: realCount,
  });
  return items;
}

// get revo-viewport items parameters, caching position and calculating items count in revo-viewport
export function getItems(
  opt: {
    startIndex: number;
    start: number;
    origSize: number;
    maxSize: number;
    maxCount: number;
    sizes?: RevoGrid.ViewSettingSizeProp;
  },
  currentSize: number = 0,
): RevoGrid.VirtualPositionItem[] {
  const items: RevoGrid.VirtualPositionItem[] = [];
  let index: number = opt.startIndex;
  let size: number = currentSize;
  while (size <= opt.maxSize && index < opt.maxCount) {
    const newSize: number = getItemSize(index, opt.sizes, opt.origSize);
    items.push({
      start: opt.start + size,
      end: opt.start + size + newSize,
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
export function recombineByOffset(
  offset: number,
  data: {
    positiveDirection: boolean;
  } & ItemsToUpdate &
    Pick<RevoGrid.DimensionSettingsState, 'sizes' | 'realSize' | 'originItemSize'>,
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
