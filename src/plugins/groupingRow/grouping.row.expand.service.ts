import { RevoGrid } from '../../interfaces';
import { PSEUDO_GROUP_ITEM_ID, GROUP_EXPANDED, GROUP_DEPTH } from './grouping.const';
import { isGrouping, getParsedGroup, isSameGroup } from './grouping.service';

// provide collapse data
export function doCollapse(pIndex: number, source: RevoGrid.DataType[]) {
  const model = source[pIndex];
  const currentId = model[PSEUDO_GROUP_ITEM_ID];
  const trimmed: Record<number, boolean> = {};
  let i = pIndex + 1;
  const total = source.length;
  while (i < total) {
    const currentModel = source[i];
    if (isGrouping(currentModel)) {
      if (currentId !== currentModel[PSEUDO_GROUP_ITEM_ID]) {
        break;
      } else {
        currentModel[GROUP_EXPANDED] = false;
      }
    }
    trimmed[i++] = true;
  }
  model[GROUP_EXPANDED] = false;
  return { trimmed };
}

/**
 *
 * @param pIndex - physical index
 * @param vIndex - virtual index, need to update item collection
 * @param source - data source
 * @param rowItemsIndexes - row indexes
 */
export function doExpand(vIndex: number, source: RevoGrid.DataType[], rowItemsIndexes: number[]) {
  const physicalIndex = rowItemsIndexes[vIndex];
  const model = source[physicalIndex];
  const currentGroup = getParsedGroup(model[PSEUDO_GROUP_ITEM_ID]);
  const trimmed: Record<number, boolean> = {};

  // no group found
  if (!currentGroup) {
    return { trimmed };
  }

  const groupItems: number[] = [];
  model[GROUP_EXPANDED] = true;
  let i = physicalIndex + 1;
  const total = source.length;
  let groupLevelOnly = 0;

  // go through all rows
  while (i < total) {
    const currentModel = source[i];
    const isGroup = isGrouping(currentModel);
    // group found
    if (isGroup) {
      if (!isSameGroup(currentGroup, model, currentModel)) {
        break;
      } else if (!groupLevelOnly) {
        // if get group first it's group only level
        groupLevelOnly = currentModel[GROUP_DEPTH];
      }
    }
    // level 0 or same depth
    if (!groupLevelOnly || (isGroup && groupLevelOnly === currentModel[GROUP_DEPTH])) {
      trimmed[i] = false;
      groupItems.push(i);
    }
    i++;
  }
  const result: {
    trimmed: Record<number, boolean>;
    items?: number[];
  } = {
    trimmed,
  };
  if (groupItems.length) {
    const items = [...rowItemsIndexes];
    items.splice(vIndex + 1, 0, ...groupItems);
    result.items = items;
  }
  return result;
}
