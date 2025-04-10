import sortedIndex from 'lodash/sortedIndex';

import type {
  DimensionSettingsState,
  PositionItem,
  ViewSettingSizeProp,
} from '@type';

export type DimensionPosition = Pick<
  DimensionSettingsState,
  'indexes' | 'positionIndexes' | 'originItemSize' | 'positionIndexToItem'
>;
export type DimensionIndexInput = Pick<
  DimensionSettingsState,
  'indexes' | 'originItemSize' | 'indexToItem'
>;
export type DimensionSize = Pick<
  DimensionSettingsState,
  | 'indexes'
  | 'positionIndexes'
  | 'positionIndexToItem'
  | 'indexToItem'
  | 'realSize'
  | 'sizes'
>;
/**
 * Pre-calculation
 * Dimension custom sizes for each cell
 * Keeps only changed sizes, skips origin size
 */
export function calculateDimensionData(
  originItemSize: number,
  newSizes: ViewSettingSizeProp = {},
) {
  const positionIndexes: number[] = [];
  const positionIndexToItem: { [position: number]: PositionItem } = {};
  const indexToItem: { [index: number]: PositionItem } = {};

  // prepare order sorted new sizes and calculate changed real size
  const newIndexes = Object.keys(newSizes).map(Number).sort((a, b) => a - b);
  let previous: PositionItem | undefined;
  for (let i = 0; i < newIndexes.length; i++) {
    const itemIndex = newIndexes[i];
    const newItem: PositionItem = {
      itemIndex,
      start: 0,
      end: 0,
    };
    // if previous item was changed too
    if (previous) {
      const itemsBetween =
        (itemIndex - previous.itemIndex - 1) * originItemSize;
      newItem.start = itemsBetween + previous.end;
    } else {
      newItem.start = itemIndex * originItemSize;
    }
    newItem.end = newItem.start + newSizes[itemIndex];
    positionIndexes.push(newItem.start);
    indexToItem[itemIndex] = positionIndexToItem[i] = newItem;
    previous = newItem;
  }
  return {
    indexes: newIndexes,
    positionIndexes: [...positionIndexes],
    positionIndexToItem: { ...positionIndexToItem },
    indexToItem,
  };
}

/**
 * Calculate item by position
 */
export const getItemByPosition = (
  {
    indexes,
    positionIndexes,
    originItemSize,
    positionIndexToItem,
  }: Pick<DimensionPosition, 'indexes' | 'positionIndexes' | 'originItemSize' | 'positionIndexToItem'>,
  pos: number,
) => {
  const item: PositionItem = {
    itemIndex: 0,
    start: 0,
    end: 0,
  };
  const currentPlace = indexes.length ? sortedIndex(positionIndexes, pos) : 0;
  // not found or first index
  if (!currentPlace) {
    item.itemIndex = Math.floor(pos / originItemSize);
    item.start = item.itemIndex * originItemSize;
    item.end = item.start + originItemSize;
    return item;
  }
  const positionItem = positionIndexToItem[currentPlace - 1];
  // if item has specified size
  if (positionItem.end > pos) {
    return positionItem;
  }
  // special size item was present before
  const relativePos = pos - positionItem.end;
  const relativeIndex = Math.floor(relativePos / originItemSize);
  item.itemIndex = positionItem.itemIndex + 1 + relativeIndex;
  item.start = positionItem.end + relativeIndex * originItemSize;
  item.end = item.start + originItemSize;
  return item;
};

export function getItemByIndex(
  dimension: Pick<
    DimensionIndexInput,
    'indexToItem' | 'indexes' | 'originItemSize'
  >,
  index: number,
) {
  let item: PositionItem = {
    itemIndex: index,
    start: 0,
    end: 0,
  };
  // if item has specified size
  if (dimension.indexToItem[index]) {
    return dimension.indexToItem[index];
  }

  const currentPlace = dimension.indexes.length
    ? sortedIndex(dimension.indexes, index)
    : 0;
  // not found or first index
  if (!currentPlace) {
    item.start = item.itemIndex * dimension.originItemSize;
    item.end = item.start + dimension.originItemSize;
    return item;
  }
  // special size item was present before
  const positionItem =
    dimension.indexToItem[dimension.indexes[currentPlace - 1]];
  item.start =
    positionItem.end +
    (index - positionItem.itemIndex - 1) * dimension.originItemSize;
  item.end = item.start + dimension.originItemSize;
  return item;
}
