import { RevoGrid } from '../../interfaces';
import { PSEUDO_GROUP_ITEM_ID, GROUP_EXPANDED, GROUP_DEPTH } from './grouping.const';
import { isGrouping, getParsedGroup, isSameGroup } from './grouping.service';

  // provide collapse data
  export function doCollapse(
    pIndex: number,
    source: RevoGrid.DataType[]
  ) {
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
    return {trimmed};
  } 

  // provide expand data
  export function doExpand(
    pIndex: number,
    vIndex: number,
    source: RevoGrid.DataType[],
    rowItemsIndexes: number[]
  ) {
    const model = source[pIndex];
    const currentGroup = getParsedGroup(model[PSEUDO_GROUP_ITEM_ID]);
    const trimmed: Record<number, boolean> = {};

    // no group found
    if (!currentGroup) {
      return {trimmed};
    }

    const groupItems: number[] = [];
    model[GROUP_EXPANDED] = true;
    let i = pIndex + 1;
    const total = source.length;
    let groupLevelOnly = 0;
    while (i < total) {
      const currentModel = source[i];
      const isGroup = isGrouping(currentModel);
      if (isGroup) {
        if (!isSameGroup(currentGroup, model, currentModel)) {
          break;
        } else if (!groupLevelOnly) {
          // if get group first it's group only level
          groupLevelOnly = currentModel[GROUP_DEPTH];
        }
      }
      if (!groupLevelOnly || isGroup && groupLevelOnly === currentModel[GROUP_DEPTH]) {
        trimmed[i] = false;
        groupItems.push(i);
      }
      i++;
    }
    const result: {
      trimmed: Record<number, boolean>,
      items?: number[]
    } = {
      trimmed
    };
    if (groupItems.length) {
      const items = [...rowItemsIndexes];
      items.splice(vIndex + 1, 0, ...groupItems);
      result.items = items;
    }
    return result;
  }
