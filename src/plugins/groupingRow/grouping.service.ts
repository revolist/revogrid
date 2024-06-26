import { DataType, ColumnProp, ColumnRegular } from '@type';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  PSEUDO_GROUP_COLUMN,
  PSEUDO_GROUP_ITEM,
  PSEUDO_GROUP_ITEM_ID,
  PSEUDO_GROUP_ITEM_VALUE,
  GROUP_ORIGINAL_INDEX,
} from './grouping.const';
import { GroupLabelTemplateFunc } from './grouping.row.types';

export type ExpandedOptions = {
  prevExpanded?: Record<string, boolean>;
  expandedAll?: boolean; // skip trim

  getGroupValue?(item: DataType, prop: string | number): any;
  groupLabelTemplate?: GroupLabelTemplateFunc;
};

type GroupedData = Map<string, GroupedData | DataType[]>;

function getGroupValueDefault(item: DataType, prop: string | number) {
  return item[prop] || null;
}


/**
 * Gather data for grouping
 * @param array - flat data array
 * @param groupIds - ids of groups
 * @param expanded - potentially expanded items if present
 */
export function gatherGrouping(
  array: DataType[],
  groupIds: ColumnProp[],
  { prevExpanded, expandedAll, getGroupValue = getGroupValueDefault }: ExpandedOptions,
) {
  const groupedItems: GroupedData = new Map();
  array.forEach((item, originalIndex) => {
    const groupLevelValues = groupIds.map(groupId => getGroupValue(item, groupId));
    const lastLevelValue = groupLevelValues.pop();
    let currentGroupLevel = groupedItems;
    groupLevelValues.forEach(value => {
      if (!currentGroupLevel.has(value)) {
        currentGroupLevel.set(value, new Map());
      }
      currentGroupLevel = currentGroupLevel.get(value) as GroupedData;
    });
    if (!currentGroupLevel.has(lastLevelValue)) {
      currentGroupLevel.set(lastLevelValue, []);
    }
    const lastLevelItems = currentGroupLevel.get(
      lastLevelValue,
    ) as DataType[];
    lastLevelItems.push({
      ...item,
      [GROUP_ORIGINAL_INDEX]: originalIndex,
    });
  });

  let itemIndex = -1;
  const groupingDepth = groupIds.length;
  // collapse all groups in the beginning
  const trimmed: Record<number, boolean> = {};
  // index mapping
  const oldNewIndexMap: Record<number, number> = {};
  // check if group header exists
  const pseudoGroupTest: Record<string, number[]> = {};
  const sourceWithGroups: DataType[] = [];
  function flattenGroupMaps(
    groupedValues: GroupedData,
    parentIds: string[],
    isExpanded: boolean,
  ) {
    const depth = parentIds.length;
    groupedValues.forEach((innerGroupedValues, groupId) => {
      const levelIds = [...parentIds, groupId];
      const mergedIds = levelIds.join(',');
      const isGroupExpanded =
        isExpanded && (!!expandedAll || !!prevExpanded?.[mergedIds]);
      sourceWithGroups.push({
        [PSEUDO_GROUP_ITEM]: groupId,
        [GROUP_DEPTH]: depth,
        [PSEUDO_GROUP_ITEM_ID]: JSON.stringify(levelIds),
        [PSEUDO_GROUP_ITEM_VALUE]: mergedIds,
        [GROUP_EXPANDED]: isGroupExpanded,
      });
      itemIndex += 1;
      if (!isGroupExpanded && depth) {
        trimmed[itemIndex] = true;
      }
      if (Array.isArray(innerGroupedValues)) {
        innerGroupedValues.forEach(value => {
          itemIndex += 1;
          if (!isGroupExpanded) {
            trimmed[itemIndex] = true;
          }
          oldNewIndexMap[value[GROUP_ORIGINAL_INDEX]] = itemIndex;
          const pseudoGroupTestIds = levelIds.map((_value, index) =>
            levelIds.slice(0, index + 1).join(','),
          );
          pseudoGroupTestIds.forEach(pseudoGroupTestId => {
            if (!pseudoGroupTest[pseudoGroupTestId]) {
              pseudoGroupTest[pseudoGroupTestId] = [];
            }
            pseudoGroupTest[pseudoGroupTestId].push(itemIndex);
          });
        });
        sourceWithGroups.push(...innerGroupedValues);
      } else {
        flattenGroupMaps(innerGroupedValues, levelIds, isGroupExpanded);
      }
    });
  }
  flattenGroupMaps(groupedItems, [], true);

  return {
    sourceWithGroups, // updates source mirror
    depth: groupingDepth, // largest depth for grouping
    trimmed, // used for expand/collapse grouping values
    oldNewIndexMap, // used for mapping old values to new
    childrenByGroup: pseudoGroupTest, // used to get child items in group
  };
}

export function getGroupingName(rgRow?: DataType) {
  return rgRow && rgRow[PSEUDO_GROUP_ITEM];
}

export function isGrouping(rgRow?: DataType) {
  return rgRow && typeof rgRow[PSEUDO_GROUP_ITEM] !== 'undefined';
}

export function isGroupingColumn(column?: ColumnRegular) {
  return column && typeof column[PSEUDO_GROUP_COLUMN] !== 'undefined';
}

export function measureEqualDepth<T>(groupA: T[], groupB: T[]) {
  const ln = groupA.length;
  let i = 0;
  for (; i < ln; i++) {
    if (groupA[i] !== groupB[i]) {
      return i;
    }
  }
  return i;
}

export function getParsedGroup(id: string): any[] {
  const parseGroup = JSON.parse(id);
  // extra precaution and type safe guard
  if (!Array.isArray(parseGroup)) {
    return null;
  }
  return parseGroup;
}

// check if items is child of current clicked group
export function isSameGroup(
  currentGroup: any[],
  currentModel: DataType,
  nextModel: DataType,
) {
  const nextGroup = getParsedGroup(nextModel[PSEUDO_GROUP_ITEM_ID]);
  if (!nextGroup) {
    return false;
  }

  const depth = measureEqualDepth(currentGroup, nextGroup);
  return currentModel[GROUP_DEPTH] < depth;
}
