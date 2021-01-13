import { Edition, RevoGrid } from '../../interfaces';
import { DataProvider } from '../../services/data.provider';
import { getPhysical, setItems } from '../../store/dataSource/data.store';
import BasePlugin from '../basePlugin';
import { GROUP_DEPTH, GROUP_EXPANDED, GROUP_EXPAND_EVENT, PSEUDO_GROUP_ITEM_ID, PSEUDO_GROUP_ITEM_VALUE } from './grouping.row.renderer';
import { gatherGrouping, getParsedGroup, isGrouping, measureEqualDepth } from './grouping.service';

export type GroupingOptions = {
  // properties array to group
  props?: RevoGrid.ColumnProp[];
};

type BeforeSourceSetEvent = {
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
};

type OnExpandEvent = {
  model: RevoGrid.DataType;
  virtualIndex: number;
};

type SourceGather = {
  source: RevoGrid.DataType[];
  expanded: Record<string, boolean>;
};

const TRIMMED_GROUPING = 'grouping';

export default class GroupingRowPlugin extends BasePlugin {
    private groupingProps: RevoGrid.ColumnProp[]|undefined;

    constructor(protected revogrid: HTMLRevoGridElement, private providers: {
      dataProvider: DataProvider
    }) {
			super(revogrid);
    }

    private doSourceUpdate() {
      if (!this.groupingProps || !this.groupingProps.length) {
        return;
      }
      const {source, expanded} = this.getSource(true);
      const {sourceWithGroups, depth, trimmed} = gatherGrouping(
        source,
        item => this.groupingProps.map(key => item[key]),
        expanded
      );
      this.providers.dataProvider.setData(
        sourceWithGroups,
        'row',
        { depth, groups: {[this.getGroupingField()]: true}},
        true
      );
      this.revogrid.addTrimmed(trimmed, TRIMMED_GROUPING);
    }

    private onFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
      if (isGrouping(e.detail.model)) {
        e.preventDefault();
      }
    }

    private onExpand({ virtualIndex }: OnExpandEvent) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      const {source} = this.getSource();
      let newTrimmed = rowStore.get('trimmed')[TRIMMED_GROUPING];

      let i = getPhysical(rowStore, virtualIndex);
      const model = source[i];
      const prevExpanded = model[GROUP_EXPANDED];
      if (!prevExpanded) {
        const {trimmed} = this.doExpand(i, virtualIndex, source);
        newTrimmed = {...newTrimmed, ...trimmed};
      } else {
        const {trimmed} = this.doCollapse(i, source);
        newTrimmed = {...newTrimmed, ...trimmed};
        this.revogrid.clearFocus();
      }

      this.setSource(source);
      this.revogrid.addTrimmed(newTrimmed, TRIMMED_GROUPING);
    }

    private doCollapse(
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

    private doExpand(
      pIndex: number,
      vIndex: number,
      source: RevoGrid.DataType[]
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
          if (!this.isSameGroup(currentGroup, model, currentModel)) {
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
      if (groupItems.length) {
        const rowStore = this.providers.dataProvider.stores.row.store;
        const items = [...this.getItems()];
        items.splice(vIndex + 1, 0, ...groupItems);
        setItems(rowStore, items);
      }
      return {trimmed};
    }

    private isSameGroup(currentGroup: any[], currentModel: RevoGrid.DataType, nextModel: RevoGrid.DataType) {
      const nextGroup = getParsedGroup(nextModel[PSEUDO_GROUP_ITEM_ID]);
      if (!nextGroup) {
        return false;
      }
      
      const depth = measureEqualDepth(currentGroup, nextGroup);
      return currentModel[GROUP_DEPTH] <= depth;
    }

    private onDataSet(data: BeforeSourceSetEvent) {
      if (this.groupingProps && this.groupingProps.length && data.source) {
        const {sourceWithGroups, depth, trimmed} = gatherGrouping(data.source, item => this.groupingProps.map(key => item[key]));
        data.source = sourceWithGroups;
        this.providers.dataProvider.setGrouping({depth, prop: this.getGroupingField()});
        this.revogrid.addTrimmed(trimmed, TRIMMED_GROUPING);
      }
    }

    private getGroupingField() {
      return this.groupingProps[0];
    }

    private getItems() {
      const rowStore = this.providers.dataProvider.stores.row.store;
      return rowStore.get('items');
    }

    private getSource(withoutGrouping = false) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      const source = rowStore.get('source');
      const items = rowStore.get('proxyItems');
      // order important here, expected parent is first, then others
      return items.reduce((result: SourceGather, i) => {
        const model = source[i];
        if (!withoutGrouping) {
          result.source.push(model);
          return result;
        }

        // grouping filter
        if (!isGrouping(model)) {
          result.source.push(model);
        } else {
          if (model[GROUP_EXPANDED] ) {
            result.expanded[model[PSEUDO_GROUP_ITEM_VALUE]] = true;
          }
        }
        return result;
      }, {
        source: [],
        expanded: {}
      });
    }

    private setSource(data: RevoGrid.DataType[]) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      rowStore.set('source', data);
    }

    private onDrag(e: CustomEvent<{from: number; to: number;}>) {
      const {from, to} = e.detail;
      const isDown = (to - from) >= 0;
      const {source} = this.getSource();
      const items = this.getItems();
      let i = isDown ? from : to;
      const end = isDown ? to : from;
      for (; i < end; i++) {
        const model = source[items[i]];
        const isGroup = isGrouping(model);
        if (isGroup) {
          e.preventDefault();
          return;
        }
      }
    }

    private subscribe() {
      this.addEventListener('beforeSourceSet', ({detail}: CustomEvent<BeforeSourceSetEvent>) => {
        this.onDataSet(detail);
      });
      this.addEventListener('afterFilterApply', () => {
        this.doSourceUpdate();
      });
      this.addEventListener('afterSortingApply', () => {
        this.doSourceUpdate();
      });
      this.addEventListener('beforeCellFocus', e => this.onFocus(e));
      this.addEventListener('rowOrderChanged', e => this.onDrag(e))
      this.addEventListener(GROUP_EXPAND_EVENT, ({detail}: CustomEvent<OnExpandEvent>) => this.onExpand(detail));
    }

    // apply grouping
    setGrouping({props}: GroupingOptions) {
      // unsubscribe from all events when group applied
      this.clearSubscriptions();
      this.groupingProps = props;
      // clear props, no grouping exists
      if (!props || !Object.keys(props).length) {
        this.clearGrouping();
        return;
      }
      // props exist and source inited
      const {source} = this.getSource();
      if (source.length) {
        this.doSourceUpdate();
      }
      // if has any grouping subscribe to events again
      this.subscribe();
    }
    
    clearGrouping() {
      const {source} = this.getSource(true);
      this.providers.dataProvider.setData(source);
    }
}