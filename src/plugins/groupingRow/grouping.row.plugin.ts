import { RevoGrid } from "../../interfaces";
import BasePlugin from "../basePlugin";
import { PSEUDO_GROUP_ITEM } from "./grouping.row.renderer";

type BeforeSourceSetEvent = {
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
};

type GroupingIndex = {[key: string]: GroupingIndex};
const GROUP_DEPTH = '__rvgr-depth';

export default class GroupingRowPlugin extends BasePlugin {
    private currentGrouping: string[]|undefined;
    private currentGroupingIndexes: GroupingIndex|undefined;

    constructor(protected revogrid: HTMLRevoGridElement) {
			super(revogrid);
			const beforeSourceSet = ({detail}: CustomEvent<BeforeSourceSetEvent>) => this.onDataSet(detail);
			this.addEventListener('beforeSourceSet', beforeSourceSet);
    }

    private onDataSet(data: BeforeSourceSetEvent) {
      if (this.currentGrouping && this.currentGrouping.length && data.source) {
        data.source = groupBy(data.source, item => this.currentGrouping.map(key => item[key]));
        console.log(data.source);
      }
    }

    setGrouping(groups: string[]) {
			this.currentGroupingIndexes = {};
			groups?.reduce((r: GroupingIndex, model) => {
				r[model] = {};
				return r[model];
			}, this.currentGroupingIndexes);
			this.currentGrouping = groups;
    }

    static isGrouping(row: RevoGrid.DataType): boolean {
      return typeof row[PSEUDO_GROUP_ITEM] !== 'undefined';
    }
}

type Group<T> = {
	id: string;
	children: T[];
	ids: number[];
};

function groupBy<T>(array: T[], f: (v: T) => any) {
  const groups: Record<string, any> = {};
  const groupIndexes: Record<string, number[]> = {};
  const groupsOrder: Group<T>[] = [];

  // build groups
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

  const itemsMirror: RevoGrid.DataType[] = [];
  const pseudoGroupTest: GroupingIndex = {};
  // let currentIndex = 0;
  groupsOrder.forEach(group => {
    const parseGroup = JSON.parse(group.id);
    if (!isArray(parseGroup)) {
        return;
    }

    let depth = 0;
    parseGroup.reduce((existingGroups: GroupingIndex, groupValue: string) => {
			if (!existingGroups[groupValue]) {
				itemsMirror.push({
					[PSEUDO_GROUP_ITEM]: groupValue,
					[GROUP_DEPTH]: depth,
				});
				existingGroups[groupValue] = {};
			}
			depth++;
			return existingGroups[groupValue];
    }, pseudoGroupTest);
    group.children.forEach(item => itemsMirror.push(item));
  });
  return itemsMirror;
}

function isArray<T>(data: any|T[]): data is T[] {
	return typeof (data as T[]).push !== 'undefined';
}