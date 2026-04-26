import { gatherTrimmedItems, Trimmed, TrimmedEntity } from '@store';
import type { DataType } from '@type';
import { GROUP_DEPTH } from './grouping.const';
import { isGrouping } from './grouping.service';

export const TRIMMED_GROUPING = 'grouping';

/**
 * Prepare trimming updated indexes for grouping
 * @param initiallyTrimed
 * @param firstLevelMap
 * @param secondLevelMap
 */
export function processDoubleConversionTrimmed(initiallyTrimed: Trimmed, firstLevelMap: Record<number, number>, secondLevelMap?: Record<number, number>) {
  const trimemedOptionsToUpgrade: Trimmed = {};
  /**
   * go through all groups except grouping
   */
  for (let type in initiallyTrimed) {
    if (type === TRIMMED_GROUPING) {
      continue;
    }
    const items = initiallyTrimed[type];
    const newItems: TrimmedEntity = {};

    for (let initialIndex in items) {
      if (!items[initialIndex]) {
        continue;
      }
      /**
       * if item exists we find it in collection
       * we support 2 level of conversions
       */
      let newConversionIndex = firstLevelMap[initialIndex];
      if (secondLevelMap) {
        newConversionIndex = secondLevelMap[newConversionIndex];
      }
      // Group rows do not exist in the ungrouped index map and must not leak into new trims.
      if (typeof newConversionIndex !== 'number') {
        continue;
      }

      /**
       * if item was trimmed previously
       * trimming makes sense to apply
       */
      newItems[newConversionIndex] = true;
    }
    if (Object.keys(newItems).length) {
      trimemedOptionsToUpgrade[type] = newItems;
    }
  }
  return trimemedOptionsToUpgrade;
}

function hasVisibleGroupItems(
  source: DataType[],
  trimmed: TrimmedEntity,
  groupIndex: number,
) {
  const depth = source[groupIndex]?.[GROUP_DEPTH];
  // A group is visible when at least one descendant data row survives filtering.
  for (let i = groupIndex + 1; i < source.length; i++) {
    const model = source[i];
    if (isGrouping(model)) {
      if (model[GROUP_DEPTH] <= depth) {
        break;
      }
      continue;
    }
    if (!trimmed[i]) {
      return true;
    }
  }
  return false;
}

/**
 * Preserves data-row filter results and recalculates group-row visibility
 * from the filtered state of each group's descendant data rows.
 *
 * @param source - Grouped row source that contains group rows and data rows.
 * @param filterTrimmed - Current filter trim map keyed by physical row index.
 * @returns Filter trim map with empty group rows hidden and matching group rows visible.
 */
export function filterOutEmptyGroupRows(
  source: DataType[],
  filterTrimmed: TrimmedEntity,
) {
  const trimmed: TrimmedEntity = { ...filterTrimmed };
  // Recalculate only group rows; data-row filter results are preserved as-is.
  source.forEach((model, index) => {
    if (!isGrouping(model)) {
      return;
    }
    if (hasVisibleGroupItems(source, trimmed, index)) {
      delete trimmed[index];
    } else {
      trimmed[index] = true;
    }
  });
  return trimmed;
}

/**
 * Builds grouping trims from an explicit group-to-children map by hiding
 * groups whose children are all hidden by any active trim type.
 *
 * @param allTrimmedGroups - Active trim maps keyed by trim type.
 * @param childrenByGroup - Child row indexes keyed by group row index.
 * @returns Grouping trim map that hides groups without visible children.
 */
export function filterOutEmptyGroups(allTrimmedGroups: Trimmed, childrenByGroup: Record<number, number[]> = {}) {
  const trimmedGroup: TrimmedEntity = {};
  const allTrimmed = gatherTrimmedItems(allTrimmedGroups);
  // find is groups are filled
  for (let groupIndex in childrenByGroup) {
    const hasChidlren = childrenByGroup[groupIndex].filter(childIndex => !allTrimmed[childIndex]).length > 0;
    if (!hasChidlren) {
      trimmedGroup[groupIndex] = true;
    }
  }
  return trimmedGroup;
}
