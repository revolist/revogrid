import each from 'lodash/each';
import sortedIndex from 'lodash/sortedIndex';
import reduce from 'lodash/reduce';


import {mergeSortedArray} from '../../utils/utils';
import {RevoGrid} from "../../interfaces";

export type DimensionPosition =
    Pick<RevoGrid.DimensionSettingsState, 'indexes'|'positionIndexes'|'originItemSize'|'positionIndexToItem'>;

/**
* Pre-calculation dimension sizes and sizes for each cell
*/
export function calculateDimensionData(
  state: RevoGrid.DimensionSettingsState,
  newSizes: RevoGrid.ViewSettingSizeProp
): Pick<RevoGrid.DimensionSettingsState,
    'indexes'|'positionIndexes'|'positionIndexToItem'|'indexToItem'|'realSize'|'sizes'
  > {
  let positionIndexes: number[] = [];

  const positionIndexToItem: {[position: number]: RevoGrid.PositionItem} = {};
  const indexToItem: {[index: number]: RevoGrid.PositionItem} = {};

  // to compare how real width changed
  let newTotal: number = 0;

  // combine all sizes
  const sizes: RevoGrid.ViewSettingSizeProp = {...state.sizes, ...newSizes};
  // prepare order sorted new sizes and calculate changed real size
  let newIndexes: number[] = [];
  each(newSizes, (size: number, index: string) => {
    // if first introduced custom size
    if (!state.sizes[index]) {
      newTotal += size - (state.realSize ? state.originItemSize : 0);
      newIndexes.splice(sortedIndex(newIndexes, parseInt(index, 10)), 0, parseInt(index, 10));
    } else {
      newTotal += size - state.sizes[index];
    }
  });

  // add order to cached order collection for faster linking
  const updatedIndexesCache: number[] = mergeSortedArray(state.indexes, newIndexes);

  // fill new coordinates
  reduce(updatedIndexesCache, (previous: RevoGrid.PositionItem|undefined, itemIndex: number, i: number) => {
    const newItem: RevoGrid.PositionItem = {
      itemIndex,
      start: 0,
      end: 0
    };
    if (previous) {
      newItem.start = (itemIndex - previous.itemIndex - 1) * state.originItemSize + previous.end;
    } else {
      newItem.start = itemIndex * state.originItemSize;
    }
    newItem.end = newItem.start + sizes[itemIndex];
    positionIndexes.push(newItem.start);
    indexToItem[itemIndex] = positionIndexToItem[i] = newItem;
    return newItem;
  }, undefined);

  return {
    indexes: updatedIndexesCache,
    positionIndexes,
    positionIndexToItem,
    indexToItem,
    realSize: state.realSize + newTotal,
    sizes
  };
}

export function getItemByPosition(
    dimension: DimensionPosition,
    pos: number): RevoGrid.PositionItem {
  const item: RevoGrid.PositionItem = {
    itemIndex: 0,
    start: 0,
    end: 0
  };
  const currentPlace: number = dimension.indexes.length ? sortedIndex(dimension.positionIndexes, pos) : 0;
  // not found or first index
  if (!currentPlace) {
    item.itemIndex = Math.floor(pos/dimension.originItemSize);
    item.start = item.itemIndex * dimension.originItemSize;
    item.end = item.start + dimension.originItemSize;
    return item;
  }
  const positionItem: RevoGrid.PositionItem = dimension.positionIndexToItem[currentPlace - 1];
  // if item has specified size
  if (positionItem.end > pos) {
    return positionItem;
  }
  // special size item was present before
  const relativePos: number = pos - positionItem.end;
  const relativeIndex: number = Math.floor(relativePos/dimension.originItemSize);
  item.itemIndex = positionItem.itemIndex + 1 + relativeIndex;
  item.start = positionItem.end + relativeIndex * dimension.originItemSize;
  item.end = item.start + dimension.originItemSize;
  return item;
}

export function getItemByIndex(
    dimension: Pick<RevoGrid.DimensionSettingsState, 'indexes'|'originItemSize'|'indexToItem'>,
    index: number): RevoGrid.PositionItem {
  let item: RevoGrid.PositionItem = {
    itemIndex: index,
    start: 0,
    end: 0
  };
  // if item has specified size
  if (dimension.indexToItem[index]) {
    return dimension.indexToItem[index];
  }

  const currentPlace: number = dimension.indexes.length ? sortedIndex(dimension.indexes, index) : 0;
  // not found or first index
  if (!currentPlace) {
    item.start = item.itemIndex * dimension.originItemSize;
    item.end = item.start + dimension.originItemSize;
    return item;
  }
  // special size item was present before

  const positionItem: RevoGrid.PositionItem = dimension.indexToItem[dimension.indexes[currentPlace - 1]];
  item.start = positionItem.end + (index - positionItem.itemIndex - 1) * dimension.originItemSize;
  item.end = item.start + dimension.originItemSize;
  return item;
}
