import { Edition, RevoGrid } from '../../interfaces';
import { DataProvider } from '../../services/data.provider';
import { getPhysical } from '../../store/dataSource/data.store';
import BasePlugin from '../basePlugin';
import { GROUP_DEPTH, GROUP_EXPANDED, GROUP_EXPAND_EVENT, PSEUDO_GROUP_ITEM_ID } from './grouping.row.renderer';
import { gatherGrouping, isGrouping } from './grouping.service';

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

const TRIMMED_GROUPING = 'grouping';

export default class GroupingRowPlugin extends BasePlugin {
    private groupingProps: RevoGrid.ColumnProp[]|undefined;

    constructor(protected revogrid: HTMLRevoGridElement, private providers: {
      dataProvider: DataProvider
    }) {
			super(revogrid);
      this.addEventListener('beforeSourceSet', ({detail}: CustomEvent<BeforeSourceSetEvent>) => {
        this.onDataSet(detail);
      });
      this.addEventListener('afterFilterApply', () => {
        console.log('filter');
        this.doSourceUpdate();
      });
      this.addEventListener('afterSortingApply', () => {
        this.doSourceUpdate();
      });
      this.addEventListener('beforeCellFocus', e => this.onFocus(e));
      this.addEventListener(GROUP_EXPAND_EVENT, ({detail}: CustomEvent<OnExpandEvent>) => this.onExpand(detail));
    }

    private doSourceUpdate() {
      if (!this.groupingProps || !this.groupingProps.length) {
        return;
      }
      const source = this.getSource(true);
      const {sourceWithGroups, depth, trimmed} = gatherGrouping(source, item => this.groupingProps.map(key => item[key]));
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
      const source = [...this.getSource()];
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
      const currentId = model[PSEUDO_GROUP_ITEM_ID];
      const trimmed: Record<number, boolean> = {};
      const groupItems: number[] = [];
      model[GROUP_EXPANDED] = true;
      let i = pIndex + 1;
      const total = source.length;
      let groupLevelOnly = 0;
      while (i < total) {
        const currentModel = source[i];
        const isGroup = isGrouping(currentModel);
        if (isGroup) {
          if (currentId !== currentModel[PSEUDO_GROUP_ITEM_ID]) {
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
        const items = [...rowStore.get('items')];
        items.splice(vIndex + 1, 0, ...groupItems);
        rowStore.set('items', items);
      }
      return {trimmed};
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

    private getSource(withoutGrouping = false) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      const source = [...rowStore.get('source')];
      if (!withoutGrouping) {
        return source;
      }
      return source.filter(m => !isGrouping(m));
    }

    private setSource(data: RevoGrid.DataType[]) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      rowStore.set('source', data);
    }

    // apply grouping
    setGrouping({props}: GroupingOptions) {
      this.groupingProps = props;
      // clear props
      if (!props || !Object.keys(props).length) {
        this.clearGrouping();
        return;
      }
      // props exist and source inited
      if (this.getSource().length) {
        this.doSourceUpdate();
      }
    }
    
    clearGrouping() {
      this.providers.dataProvider.setData(this.getSource(true));
    }
}