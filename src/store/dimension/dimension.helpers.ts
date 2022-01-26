import each from 'lodash/each';
import sortedIndex from 'lodash/sortedIndex';
import reduce from 'lodash/reduce';
import { RevoGrid } from '../../interfaces';

export type DimensionPosition = Pick<RevoGrid.DimensionSettingsState, 'indexes' | 'positionIndexes' | 'originItemSize' | 'positionIndexToItem'>;
export type DimensionIndexInput = Pick<RevoGrid.DimensionSettingsState, 'indexes' | 'originItemSize' | 'indexToItem'>;
export type DimensionSize = Pick<RevoGrid.DimensionSettingsState, 'indexes' | 'positionIndexes' | 'positionIndexToItem' | 'indexToItem' | 'realSize' | 'sizes'>;
/**
 * Pre-calculation
 * Dimension sizes for each cell
 */
export function calculateDimensionData(
  originItemSize: number,
  newSizes: RevoGrid.ViewSettingSizeProp = {}
) {
  const positionIndexes: number[] = [];
  const positionIndexToItem: { [position: number]: RevoGrid.PositionItem } = {};
  const indexToItem: { [index: number]: RevoGrid.PositionItem } = {};

  // combine all sizes
  const sizes = { ...newSizes };
  // prepare order sorted new sizes and calculate changed real size
  let newIndexes: number[] = [];
  each(newSizes, (_, index) => {
    newIndexes[sortedIndex(newIndexes, parseInt(index, 10))] = parseInt(index, 10);
  });
  // fill new coordinates
  reduce(
    newIndexes,
    (previous: RevoGrid.PositionItem | undefined, itemIndex: number, i: number) => {
      const newItem: RevoGrid.PositionItem = {
        itemIndex,
        start: 0,
        end: 0,
      };
      if (previous) {
        newItem.start = (itemIndex - previous.itemIndex - 1) * originItemSize + previous.end;
      } else {
        newItem.start = itemIndex * originItemSize;
      }
      newItem.end = newItem.start + sizes[itemIndex];
      positionIndexes.push(newItem.start);
      indexToItem[itemIndex] = positionIndexToItem[i] = newItem;
      return newItem;
    },
    undefined,
  );

  return {
    indexes: newIndexes,
    positionIndexes: [...positionIndexes],
    positionIndexToItem: { ...positionIndexToItem },
    indexToItem,
    sizes,
  };
}

/**
 * Calculate item by position
 */
export function getItemByPosition({ indexes, positionIndexes, originItemSize, positionIndexToItem }: DimensionPosition, pos: number) {
  const item: RevoGrid.PositionItem = {
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
}

export function getItemByIndex(dimension: DimensionIndexInput, index: number) {
  let item: RevoGrid.PositionItem = {
    itemIndex: index,
    start: 0,
    end: 0,
  };
  // if item has specified size
  if (dimension.indexToItem[index]) {
    return dimension.indexToItem[index];
  }

  const currentPlace = dimension.indexes.length ? sortedIndex(dimension.indexes, index) : 0;
  // not found or first index
  if (!currentPlace) {
    item.start = item.itemIndex * dimension.originItemSize;
    item.end = item.start + dimension.originItemSize;
    return item;
  }
  // special size item was present before

  const positionItem = dimension.indexToItem[dimension.indexes[currentPlace - 1]];
  item.start = positionItem.end + (index - positionItem.itemIndex - 1) * dimension.originItemSize;
  item.end = item.start + dimension.originItemSize;
  return item;
}
