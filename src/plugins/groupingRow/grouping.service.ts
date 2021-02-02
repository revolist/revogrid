import { RevoGrid } from "../../interfaces";
import { GROUP_DEPTH, GROUP_EXPANDED, PSEUDO_GROUP_COLUMN, PSEUDO_GROUP_ITEM, PSEUDO_GROUP_ITEM_ID, PSEUDO_GROUP_ITEM_VALUE } from "./grouping.const";

type Group<T> = {
	id: string;
	children: T[];
	ids: number[];
};

export type ExpandedOptions = {
  prevExpanded?: Record<string, boolean>;
  expandedAll?: boolean; // skip trim
};

function groupBy<T>(array: T[], f: (v: T) => any) {
  const groupsOrder: Group<T>[] = [];
  const groups: Record<string, any> = {};
  const groupIndexes: Record<string, number[]> = {};
  array.forEach((item, i) => {
    // get grouping values
    const groupKeys = JSON.stringify(f(item));

    // new group identification
    if (!groups[groupKeys]) {
			groups[groupKeys] = [];
			// store indexes order
			groupIndexes[groupKeys] = [];
			// create group parents
			groupsOrder.push({
				children: groups[groupKeys],
				ids: groupIndexes[groupKeys],
				id: groupKeys
			});
    }
    // save to group
    groups[groupKeys].push(item);
    groupIndexes[groupKeys].push(i);
  });
  return groupsOrder;
}

/**
 * Gather data for grouping
 * @param array - flat data array
 * @param mapFunc - mapping function for stringify
 * @param expanded - potentially expanded items if present
 */
export function gatherGrouping<T>(
  array: T[],
  mapFunc: (v: T) => any,
  {prevExpanded, expandedAll}: ExpandedOptions) {
  // build groups
  const groupsOrder = groupBy(array, mapFunc);

  const itemsMirror: RevoGrid.DataType[] = []; // grouped source
  const pseudoGroupTest: Record<string, any> = {}; // check if group header exists

  let itemIndex = 0; // item index in source
  let groupingDepth = 0; // to save max group depth
	const trimmed: Record<number, boolean> = {}; // collapse all groups in the beginning
  // go through groups
  groupsOrder.forEach(group => {
    const parseGroup = getParsedGroup(group.id);
    // extra precaution and type safe guard
    if (!parseGroup) {
        return;
    }

    // add group headers
    let depth = 0;
    let skipTrim = !!expandedAll;
    let isExpanded = skipTrim;
    parseGroup.reduce((prevVal: string[], groupValue: string) => {
      prevVal.push(groupValue);
      const newVal = prevVal.join(',');
      // if header not added, add new header
      if (!pseudoGroupTest[newVal]) {
        isExpanded = expandedAll || prevExpanded && prevExpanded[newVal];
				itemsMirror.push(getPseudoGroup(groupValue, newVal, depth, group.id, isExpanded));

        // if not first level auto collapse
        if (depth && !isExpanded && !skipTrim) {
          // check if parent expanded, expand this layer too
          const parent = prevVal.slice(0, prevVal.length - 1);
          if (!(prevExpanded && parent.length && prevExpanded[parent.join(',')])) {
					  trimmed[itemIndex] = true;
          }
        }
        itemIndex++;
				pseudoGroupTest[newVal] = true;
      }
      // calculate depth
      depth++;
      groupingDepth = depth;
      return prevVal;
    }, []);

    // add regular items
    group.children.forEach(item => {
      if (!isExpanded && !skipTrim) {
        trimmed[itemIndex] = true; // collapse row
      }
      itemsMirror.push(item);
      itemIndex++;
    });
  });
  return {
    sourceWithGroups: itemsMirror,
    depth: groupingDepth,
    trimmed
  };
}

function getPseudoGroup(groupValue: string, value: string, depth: number, id: string, isExpanded = false) {
	return {
		[PSEUDO_GROUP_ITEM]: groupValue,
		[GROUP_DEPTH]: depth,
    [PSEUDO_GROUP_ITEM_ID]: id,
    [PSEUDO_GROUP_ITEM_VALUE]: value,
    [GROUP_EXPANDED]: isExpanded
	};
}

export function getGroupingName(row?: RevoGrid.DataType) {
  return row && row[PSEUDO_GROUP_ITEM];
}

export function isGrouping(row?: RevoGrid.DataType) {
	return row && typeof row[PSEUDO_GROUP_ITEM] !== 'undefined';
}

export function isGroupingColumn(column?: RevoGrid.ColumnRegular) {
  return column && typeof column[PSEUDO_GROUP_COLUMN] !== 'undefined';
}

export function isArray<T>(data: any|T[]): data is T[] {
	return typeof (data as T[]).push !== 'undefined';
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
  if (!isArray(parseGroup)) {
      return null;
  }
  return parseGroup;
}
