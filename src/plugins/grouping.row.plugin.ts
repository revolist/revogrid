import { RevoGrid } from "../interfaces";
import BasePlugin from "./basePlugin";

type BeforeSourceSetEvent = CustomEvent<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

type GroupingIndex = {[key: string]: GroupingIndex};

export default class GroupingRowPlugin extends BasePlugin {
    private currentGrouping: string[]|undefined;
    private currentGroupingIndexes: GroupingIndex|undefined;

    constructor(protected revogrid: HTMLRevoGridElement) {
			super(revogrid);
			const beforeSourceSet = ({detail}: BeforeSourceSetEvent) => {
				if (this.currentGrouping && this.currentGrouping.length && detail.source) {
					this.getGroupsPerModel(detail.source);
				}
			};
			this.addEventListener('beforeSourceSet', beforeSourceSet);
    }

    private getGroupsPerModel(models: RevoGrid.DataType[]) {
			groupBy(models, item => this.currentGrouping.map(key => item[key]));
    }

    setGrouping(groups: string[]) {
			this.currentGroupingIndexes ={};
			groups?.reduce((r: GroupingIndex, model) => {
				r[model] = {};
				return r[model];
			}, this.currentGroupingIndexes);
			this.currentGrouping = groups;
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

  const groupMirror: Record<number, any> = {};
  const pseudoGroup: GroupingIndex = {};
  let currentIndex = 0;
  groupsOrder.forEach(group => {
    const parseGroup = JSON.parse(group.id);
    if (!isArray(parseGroup)) {
        return;
    }

    let depth = 0;
    parseGroup.reduce((existingGroups: GroupingIndex, groupValue: string) => {
			if (!existingGroups[groupValue]) {
				groupMirror[currentIndex++] = {
					id: groupValue,
					type: 'pseudo',
					name: groupValue,
					depth
				};
				existingGroups[groupValue] = {};
			}
			depth++;
			return existingGroups[groupValue];
    }, pseudoGroup);
    group.ids.forEach(id =>
			groupMirror[currentIndex++] = {
				type: 'link',
				name: group.id,
				id,
				depth
			});
  });
  console.log(groupMirror);
  return groups;
  /*
  return Object.keys(groups).map(group => {
      console.log('---', JSON.parse(group));
      return groups[group];
  })*/
}

function isArray<T>(data: any|T[]): data is T[] {
	return typeof (data as T[]).push !== 'undefined';
}