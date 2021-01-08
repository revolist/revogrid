import { RevoGrid } from "../../interfaces";
import { GROUP_DEPTH, PSEUDO_GROUP_ITEM, PSEUDO_GROUP_ITEM_ID } from "./grouping.row.renderer";

type GroupingIndex = {[key: string]: GroupingIndex};
type Group<T> = {
	id: string;
	children: T[];
	ids: number[];
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

// gather data
export function gatherGrouping<T>(array: T[], f: (v: T) => any) {
  // build groups
  const groupsOrder = groupBy(array, f);

  const itemsMirror: RevoGrid.DataType[] = []; // grouped source
  const pseudoGroupTest: GroupingIndex = {}; // check if group header exists

  let itemIndex = 0; // item index in source
  let groupingDepth = 0; // to save max group depth
	const trimmed: Record<number, boolean> = {}; // collapse all groups in the beginning
  // go through groups
  groupsOrder.forEach(group => {
    const parseGroup = JSON.parse(group.id);
    // extra precaution and type safe guard
    if (!isArray(parseGroup)) {
        return;
    }

    // add group headers
    let depth = 0;
    parseGroup.reduce((existingGroups: GroupingIndex, groupValue: string) => {
      // if header not added, add new header
			if (!existingGroups[groupValue]) {
				itemsMirror.push(getPseudoGroup(groupValue, depth, group.id));

        // if not first level auto collapse
        if (depth) {
					trimmed[itemIndex] = true;
        }
        itemIndex++;
				existingGroups[groupValue] = {};
      }
      // calculate depth
      depth++;
      groupingDepth = depth;
			return existingGroups[groupValue];
    }, pseudoGroupTest);

    // add regular items
    group.children.forEach(item => {
      trimmed[itemIndex++] = true; // collapse row
      itemsMirror.push(item);
    });
  });
  return {
    sourceWithGroups: itemsMirror,
    depth: groupingDepth,
    trimmed
  };
}

function getPseudoGroup(groupValue: string, depth: number, id: string) {
	return {
		[PSEUDO_GROUP_ITEM]: groupValue,
		[GROUP_DEPTH]: depth,
		[PSEUDO_GROUP_ITEM_ID]: id
	};
}

export function isGrouping(row?: RevoGrid.DataType) {
	return row && typeof row[PSEUDO_GROUP_ITEM] !== 'undefined';
}

function isArray<T>(data: any|T[]): data is T[] {
	return typeof (data as T[]).push !== 'undefined';
}
