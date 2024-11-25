import type { DataType, ColumnProp, ColumnRegular } from '@type';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  PSEUDO_GROUP_COLUMN,
  PSEUDO_GROUP_ITEM,
  PSEUDO_GROUP_ITEM_ID,
  PSEUDO_GROUP_ITEM_VALUE,
  GROUP_ORIGINAL_INDEX,
  GROUP_COLUMN_PROP,
} from './grouping.const';
import type { ExpandedOptions, SourceGather } from './grouping.row.types';


type GroupedData = Map<string, GroupedData | DataType[]>;

function getGroupValueDefault(item: DataType, prop: string | number) {
  return item[prop] || null;
}

// get source based on proxy item collection to preserve rgRow order
export function getSource(
  source: DataType[],
  items: number[],
  withoutGrouping = false,
) {
  let index = 0;
  const result: Required<SourceGather> = {
    source: [],
    prevExpanded: {},
    oldNewIndexes: {},
  };
  // order important here, expected parent is first, then others
  items.forEach(i => {
    const model = source[i];
    if (!withoutGrouping) {
      result.source.push(model);
      return;
    }

    // grouping filter
    if (isGrouping(model)) {
      if (getExpanded(model)) {
        result.prevExpanded[model[PSEUDO_GROUP_ITEM_VALUE]] = true;
      }
    } else {
      result.source.push(model);
      result.oldNewIndexes[i] = index;
      index++;
    }
  });
  return result;
}

export function getExpanded(model: DataType = {}) {
  return model[GROUP_EXPANDED];
}

/**
 * Gather data for grouping
 * @param array - flat data array
 * @param columnProps - ids of groups
 * @param expanded - potentially expanded items if present
 */
export function gatherGrouping(
  array: DataType[],
  columnProps: ColumnProp[],
  {
    prevExpanded,
    expandedAll,
    getGroupValue = getGroupValueDefault,
  }: ExpandedOptions,
) {
  const groupedItems: GroupedData = new Map();
  array.forEach((item, originalIndex) => {
    const groupLevelValues = columnProps.map(groupId =>
      getGroupValue(item, groupId),
    );
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
    const lastLevelItems = currentGroupLevel.get(lastLevelValue) as DataType[];
    lastLevelItems.push({
      ...item,
      [GROUP_ORIGINAL_INDEX]: originalIndex,
    });
  });

  let itemIndex = -1;
  const groupingDepth = columnProps.length;
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
        [GROUP_COLUMN_PROP]: columnProps[depth],
        [columnProps[depth]]: groupId,
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

type GroupingItem = {
  [PSEUDO_GROUP_ITEM]: string;
  [GROUP_EXPANDED]: boolean;
  [PSEUDO_GROUP_ITEM_VALUE]: string;
  [GROUP_DEPTH]: number;
  [GROUP_COLUMN_PROP]: ColumnProp;
};

export function isGrouping(rgRow?: DataType): rgRow is GroupingItem {
  return typeof rgRow?.[PSEUDO_GROUP_ITEM] !== 'undefined';
}

export function isGroupingColumn(column?: ColumnRegular) {
  return typeof column?.[PSEUDO_GROUP_COLUMN] !== 'undefined';
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

export function getParsedGroup(id: string) {
  const parseGroup = JSON.parse(id);
  // extra precaution and type safeguard
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
