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
import type { ExpandedOptions } from './grouping.row.types';

type GroupedData = Map<string, GroupedData | DataType[]>;
type SourceGather = {
  source: DataType[];
  prevExpanded: Record<string, boolean>;
  oldNewIndexes?: Record<number, number>;
};

function getGroupValueDefault(
  item: DataType,
  prop: string | number,
  emptyGroupValue: any,
) {
  return item[prop] ?? emptyGroupValue;
}

function isDataRow(item: DataType | null | undefined): item is DataType {
  return item != null;
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
    } else if (!isDataRow(model)) {
      return;
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

function flattenGroupMaps(
  groupedValues: GroupedData,
  columnProps: ColumnProp[],
  expandedAll: boolean,
  prevExpanded: Record<string, boolean>,
) {
  // One accumulator across all levels: each row and index is appended once.
  // Passing large child arrays as arguments exceeds the engine's call limit.
  const source: DataType[] = [];
  const trimmed: Record<number, boolean> = {};
  const oldNewIndexMap: Record<number, number> = {};
  function append(groups: GroupedData, parentIds: string[], isExpanded: boolean) {
    const depth = parentIds.length;
    groups.forEach((children, groupId) => {
      const levelIds = [...parentIds, groupId];
      const mergedIds = levelIds.join(',');
      const groupExpanded = isExpanded && (expandedAll || !!prevExpanded[mergedIds]);
      const groupIndex = source.length;
      source.push({
        [PSEUDO_GROUP_ITEM]: groupId,
        [GROUP_DEPTH]: depth,
        [PSEUDO_GROUP_ITEM_ID]: JSON.stringify(levelIds),
        [PSEUDO_GROUP_ITEM_VALUE]: mergedIds,
        [GROUP_EXPANDED]: groupExpanded,
        [GROUP_COLUMN_PROP]: columnProps[depth],
        [columnProps[depth]]: groupId,
      });
      if (!isExpanded && depth) trimmed[groupIndex] = true;
      if (Array.isArray(children)) {
        for (const row of children) {
          const index = source.length;
          if (!groupExpanded) trimmed[index] = true;
          oldNewIndexMap[row[GROUP_ORIGINAL_INDEX]] = index;
          source.push(row);
        }
      } else {
        append(children, levelIds, groupExpanded);
      }
    });
  }
  append(groupedValues, [], true);
  return { source, trimmed, oldNewIndexMap };
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
    prevExpanded = {},
    expandedAll = false,
    getGroupValue,
    emptyGroupValue = '',
  }: ExpandedOptions,
) {
  const groupedItems: GroupedData = new Map();
  
  array.forEach((item, originalIndex) => {
    if (!isDataRow(item)) {
      return;
    }

    const groupLevelValues = columnProps.map(groupId =>
      getGroupValue
        ? getGroupValue(item, groupId)
        : getGroupValueDefault(item, groupId, emptyGroupValue),
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
      const groupItems: DataType[] = [];
      currentGroupLevel.set(lastLevelValue, groupItems);
    }
    const lastLevelItems = currentGroupLevel.get(lastLevelValue) as DataType[];
    lastLevelItems.push({
      ...item,
      [GROUP_ORIGINAL_INDEX]: originalIndex,
    });
  });

  const groupingDepth = columnProps.length;

  const { source: sourceWithGroups, trimmed, oldNewIndexMap } = flattenGroupMaps(
    groupedItems, columnProps, expandedAll, prevExpanded,
  );

  return {
    sourceWithGroups, // updates source mirror
    depth: groupingDepth, // largest depth for grouping
    trimmed, // used for expand/collapse grouping values
    oldNewIndexMap, // used for mapping old values to new
  };
}

export function getGroupingName(rgRow?: DataType) {
  return rgRow?.[PSEUDO_GROUP_ITEM];
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
  return column?.[PSEUDO_GROUP_COLUMN] !== undefined;
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
