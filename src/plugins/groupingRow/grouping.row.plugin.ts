import { Edition, RevoGrid } from '../../interfaces';
import ColumnDataProvider, { ColumnCollection } from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import { getPhysical, setItems } from '../../store/dataSource/data.store';
import { columnTypes } from '../../store/storeTypes';
import BasePlugin from '../basePlugin';
import { GROUP_DEPTH, GROUP_EXPANDED, GROUP_EXPAND_EVENT, PSEUDO_GROUP_COLUMN, PSEUDO_GROUP_ITEM_ID, PSEUDO_GROUP_ITEM_VALUE } from './grouping.const';
import { ExpandedOptions, gatherGrouping, getParsedGroup, isGrouping, isGroupingColumn, measureEqualDepth } from './grouping.service';

export type GroupingOptions = {
  // properties array to group
  props?: RevoGrid.ColumnProp[];
  /** is expanded by default */
  expandedAll?: boolean;
  /** 
   * choose column prop to which expand button will be applied
   * if not defined first column in grid
   */
  applyToProp?: RevoGrid.ColumnProp;
  /** 
   * choose if render cells in grouping row
   * true by default
  */
  fullRow?: boolean;
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
  prevExpanded: Record<string, boolean>;
};

const TRIMMED_GROUPING = 'grouping';

export default class GroupingRowPlugin extends BasePlugin {
    private groupingProps: RevoGrid.ColumnProp[]|undefined;

    constructor(protected revogrid: HTMLRevoGridElement, private providers: {
      dataProvider: DataProvider,
      columnProvider: ColumnDataProvider
    }) {
			super(revogrid);
    }

    // befoce cell focus
    private onFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
      if (isGrouping(e.detail.model)) {
        e.preventDefault();
      }
    }

    // expand event triggered
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

    // provide collapse data
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

    // provide expand data
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

    // check if items is child of current clicked group
    private isSameGroup(currentGroup: any[], currentModel: RevoGrid.DataType, nextModel: RevoGrid.DataType) {
      const nextGroup = getParsedGroup(nextModel[PSEUDO_GROUP_ITEM_ID]);
      if (!nextGroup) {
        return false;
      }
      
      const depth = measureEqualDepth(currentGroup, nextGroup);
      return currentModel[GROUP_DEPTH] < depth;
    }

    // get source based on proxy item collection to preserve row order
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
            result.prevExpanded[model[PSEUDO_GROUP_ITEM_VALUE]] = true;
          }
        }
        return result;
      }, {
        source: [],
        prevExpanded: {}
      });
    }

    // proxy for set source
    private setSource(data: RevoGrid.DataType[]) {
      const rowStore = this.providers.dataProvider.stores.row.store;
      rowStore.set('source', data);
    }

    // proxy for items get
    private getItems() {
      const rowStore = this.providers.dataProvider.stores.row.store;
      return rowStore.get('items');
    }

    private setColumns({columns}: ColumnCollection) {
      for (let type of columnTypes) {
        const cols = columns[type];
        // if 0 column as holder
        if (cols?.length) {
          cols[0][PSEUDO_GROUP_COLUMN] = true;
          break;
        }
      }
    }

    // evaluate drag between groups
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

    // subscribe to grid events to process them accordingly
    private subscribe() {
      /** if grouping present and new data source arrived */
      this.addEventListener('beforeSourceSet', ({detail}: CustomEvent<BeforeSourceSetEvent>) => this.onDataSet(detail));
      this.addEventListener('beforeColumnsSet', ({detail}: CustomEvent<ColumnCollection>) => this.setColumns(detail));

      /**
       * filter applied need to clear grouping and apply again
       * based on new results can be new grouping
       */ 
      // this.addEventListener('afterFilterApply', () => this.doSourceUpdate());
      this.addEventListener('beforeFilterTrimmed', ({detail: { itemsToFilter, source }}) => this.beforeFilterApply(itemsToFilter, source));
      /**
       * sorting applied need to clear grouping and apply again
       * based on new results whole grouping order will changed
      */
      this.addEventListener('afterSortingApply', () => this.doSourceUpdate());

      /**
       * Apply logic for focus inside of grouping
       * We can't focus on grouping rows, navigation only inside of groups for now
       */ 
      this.addEventListener('beforeCellFocus', e => this.onFocus(e));
      /**
       * Prevent row drag outside the group
       */
      this.addEventListener('rowOrderChanged', e => this.onDrag(e));

      /**
       * When grouping expand icon was clicked
       */
      this.addEventListener(GROUP_EXPAND_EVENT, ({detail}: CustomEvent<OnExpandEvent>) => this.onExpand(detail));
    }

    /** Before filter apply remove grouping filtering */
    private beforeFilterApply(itemsToFilter: Record<number, boolean>, source: RevoGrid.DataType[]) {
      for (let index in itemsToFilter) {
        if (itemsToFilter[index] && isGrouping(source[index])) {
          itemsToFilter[index] = false;
        }
      }
    }

    /** Start global source update with group clearing and applying new one */
    private doSourceUpdate(options?: ExpandedOptions) {
      if (!this.groupingProps || !this.groupingProps.length) {
        return;
      }
      const {source, prevExpanded} = this.getSource(true);
      const {sourceWithGroups, depth, trimmed} = gatherGrouping(
        source,
        item => this.groupingProps.map(key => item[key]),
        {
          prevExpanded,
          ...options
        }
      );
      this.providers.dataProvider.setData(
        sourceWithGroups,
        'row',
        {
          depth,
        },
        true
      );
      this.revogrid.addTrimmed(trimmed, TRIMMED_GROUPING);
    }

    /** 
     * Apply grouping on data set
     * Clear grouping from source
     * If source came from other plugin
     */
    private onDataSet(data: BeforeSourceSetEvent) {
      if (!this.groupingProps || !this.groupingProps.length || !data?.source || !data.source.length) {
        return;
      }
      const source = data.source.filter(s => !isGrouping(s));
      const expanded = this.revogrid.grouping || {};
      const {sourceWithGroups, depth, trimmed} = gatherGrouping(
        source,
        item => this.groupingProps.map(key => item[key]),
        {...(expanded || {})}
      );
      data.source = sourceWithGroups;
      this.providers.dataProvider.setGrouping({depth});
      this.revogrid.addTrimmed(trimmed, TRIMMED_GROUPING);
    }

    // apply grouping
    setGrouping(options: GroupingOptions) {
      // unsubscribe from all events when group applied
      this.clearSubscriptions();
      this.groupingProps = options.props;
      // clear props, no grouping exists
      if (!options.props || !Object.keys(options.props).length) {
        this.clearGrouping();
        return;
      }
      // props exist and source inited
      const {source} = this.getSource();
      if (source.length) {
        this.doSourceUpdate({ ...(options) });
      }
      // if has any grouping subscribe to events again
      this.subscribe();
    }
    
    // clear grouping
    clearGrouping() {
      // clear columns
      columnTypes.forEach(t => {
        const cols = this.providers.columnProvider.getColumns(t);
        let deleted = false;
        cols.forEach(c => {
          if (isGroupingColumn(c)) {
            delete c[PSEUDO_GROUP_COLUMN];
            deleted = true;
          }
        });
        // if column store had grouping clear and refresh
        if (deleted) {
          this.providers.columnProvider.refreshByType(t);
        }
      });
      // clear rows
      const {source} = this.getSource(true);
      this.providers.dataProvider.setData(source);
    }
}