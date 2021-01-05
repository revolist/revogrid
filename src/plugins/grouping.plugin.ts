import { RevoGrid } from "../interfaces";
import BasePlugin from "./basePlugin";

type BeforeSourceSetEvent = CustomEvent<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

type GroupingIndex = {[key: string]: GroupingIndex};

export default class GroupingPlugin extends BasePlugin {
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

function groupBy<T>(array: T[], f: (v: T) => any) {
  const groups: Record<string, any> = {};
  const groupsOrder: any[] = [];
  array.forEach((item) => {
    const groupKeys = JSON.stringify(f(item));

    // new group
    if (!groups[groupKeys]) {
        groups[groupKeys] = [];
        groupsOrder.push({
            children: groups[groupKeys],
            id: groupKeys
        });
    }
    // store indexes
    groups[groupKeys].push(item);
  });
  console.log(groupsOrder);
  return groups;
  /*
  return Object.keys(groups).map(group => {
      console.log('---', JSON.parse(group));
      return groups[group];
  })*/
}
/*
function isArray<T>(data: any|T[]): data is T[] {
    return typeof (data as T[]).push !== 'undefined';
} */
