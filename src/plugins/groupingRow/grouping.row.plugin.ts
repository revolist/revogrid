import { ColumnCollection } from '../../services/column.data.provider';
import { getPhysical, setItems, columnTypes, TrimmedEntity } from '@store';
import { BasePlugin } from '../base.plugin';
import { FILTER_TRIMMED_TYPE } from '../filter/filter.plugin';
import {
  GROUPING_ROW_TYPE,
  GROUP_EXPANDED,
  GROUP_EXPAND_EVENT,
  PSEUDO_GROUP_COLUMN,
  PSEUDO_GROUP_ITEM_VALUE,
} from './grouping.const';
import { doExpand, doCollapse } from './grouping.row.expand.service';
import {
  BeforeSourceSetEvent,
  GroupingOptions,
  OnExpandEvent,
  SourceGather,
} from './grouping.row.types';
import {
  ExpandedOptions,
  gatherGrouping,
  isGrouping,
  isGroupingColumn,
} from './grouping.service';
import {
  processDoubleConversionTrimmed,
  TRIMMED_GROUPING,
} from './grouping.trimmed.service';
import { BeforeSaveDataDetails, ColumnRegular, PluginProviders } from '@type';

export default class GroupingRowPlugin extends BasePlugin {
  private options: GroupingOptions | undefined;

  get hasProps() {
    return this.options?.props && this.options?.props?.length;
  }

  get store() {
    return this.providers.data.stores[GROUPING_ROW_TYPE].store;
  }

  // proxy for items get
  get rowItems() {
    return this.store.get('items');
  }

  get trimmed() {
    return this.store.get('trimmed');
  }

  constructor(
    protected revogrid: HTMLRevoGridElement,
    protected providers: PluginProviders,
  ) {
    super(revogrid, providers);
  }

  // befoce cell focus
  private onFocus(e: CustomEvent<BeforeSaveDataDetails>) {
    if (isGrouping(e.detail.model)) {
      e.preventDefault();
    }
  }

  // expand event triggered
  private onExpand({ virtualIndex }: OnExpandEvent) {
    const { source } = this.getSource();
    let newTrimmed = this.trimmed[TRIMMED_GROUPING];

    let i = getPhysical(this.store, virtualIndex);
    const model = source[i];
    const prevExpanded = model[GROUP_EXPANDED];
    if (!prevExpanded) {
      const { trimmed, items } = doExpand(virtualIndex, source, this.rowItems);
      newTrimmed = { ...newTrimmed, ...trimmed };
      if (items) {
        setItems(this.store, items);
      }
    } else {
      const { trimmed } = doCollapse(i, source);
      newTrimmed = { ...newTrimmed, ...trimmed };
      this.revogrid.clearFocus();
    }

    this.store.set('source', source);
    this.revogrid.addTrimmed(newTrimmed, TRIMMED_GROUPING);
  }

  // get source based on proxy item collection to preserve rgRow order
  private getSource(withoutGrouping = false) {
    const source = this.store.get('source');
    const items = this.store.get('proxyItems');
    let index = 0;
    // order important here, expected parent is first, then others
    return items.reduce(
      (result: SourceGather, i) => {
        const model = source[i];
        if (!withoutGrouping) {
          result.source.push(model);
          return result;
        }

        // grouping filter
        if (!isGrouping(model)) {
          result.source.push(model);
          result.oldNewIndexes[i] = index;
          index++;
        } else {
          if (model[GROUP_EXPANDED]) {
            result.prevExpanded[model[PSEUDO_GROUP_ITEM_VALUE]] = true;
          }
        }
        return result;
      },
      {
        source: [],
        prevExpanded: {},
        oldNewIndexes: {},
      },
    );
  }

  private setColumnGrouping(cols?: ColumnRegular[]) {
    // if 0 column as holder
    if (cols?.length) {
      cols[0][PSEUDO_GROUP_COLUMN] = true;
      return true;
    }
    return false;
  }

  private setColumns({ columns }: ColumnCollection) {
    for (let type of columnTypes) {
      if (this.setColumnGrouping(columns[type])) {
        break;
      }
    }
  }

  // evaluate drag between groups
  private onDrag(e: CustomEvent<{ from: number; to: number }>) {
    const { from, to } = e.detail;
    const isDown = to - from >= 0;
    const { source } = this.getSource();
    const items = this.rowItems;
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

  private beforeTrimmedApply(trimmed: Record<number, boolean>, type: string) {
    /** Before filter apply remove grouping filtering */
    if (type === FILTER_TRIMMED_TYPE) {
      const source = this.store.get('source');
      for (let index in trimmed) {
        if (trimmed[index] && isGrouping(source[index])) {
          trimmed[index] = false;
        }
      }
    }
  }

  // subscribe to grid events to process them accordingly
  private subscribe() {
    /** if grouping present and new data source arrived */
    this.addEventListener(
      'beforesourceset',
      ({ detail }: CustomEvent<BeforeSourceSetEvent>) => this.onDataSet(detail),
    );
    this.addEventListener(
      'beforecolumnsset',
      ({ detail }: CustomEvent<ColumnCollection>) => this.setColumns(detail),
    );

    /**
     * filter applied need to clear grouping and apply again
     * based on new results can be new grouping
     */
    this.addEventListener(
      'beforetrimmed',
      ({ detail: { trimmed, trimmedType } }) =>
        this.beforeTrimmedApply(trimmed, trimmedType),
    );
    /**
     * sorting applied need to clear grouping and apply again
     * based on new results whole grouping order will changed
     */
    this.addEventListener('aftersortingapply', () =>
      this.doSourceUpdate({ ...this.options }),
    );

    /**
     * Apply logic for focus inside of grouping
     * We can't focus on grouping rows, navigation only inside of groups for now
     */
    this.addEventListener('beforecellfocus', e => this.onFocus(e));
    /**
     * Prevent rgRow drag outside the group
     */
    this.addEventListener('roworderchanged', e => this.onDrag(e));

    /**
     * When grouping expand icon was clicked
     */
    this.addEventListener(
      GROUP_EXPAND_EVENT,
      ({ detail }: CustomEvent<OnExpandEvent>) => this.onExpand(detail),
    );
  }

  /**
   * Starts global source update with group clearing and applying new one
   * Initiated when need to reapply grouping
   */
  private doSourceUpdate(options?: ExpandedOptions) {
    if (!this.hasProps) {
      return;
    }
    /**
     * Get source without grouping
     * @param newOldIndexMap - provides us mapping with new indexes vs old indexes, we would use it for trimmed mapping
     */
    const { source, prevExpanded, oldNewIndexes } = this.getSource(true);
    /**
     * Group again
     * @param oldNewIndexMap - provides us mapping with new indexes vs old indexes
     */
    const {
      sourceWithGroups,
      depth,
      trimmed,
      oldNewIndexMap,
      childrenByGroup,
    } = gatherGrouping(source, this.options?.props || [], {
      prevExpanded,
      ...options,
    });

    // setup source
    this.providers.data.setData(
      sourceWithGroups,
      GROUPING_ROW_TYPE,
      this.revogrid.disableVirtualY,
      { depth, customRenderer: options?.groupLabelTemplate },
      true,
    );
    this.updateTrimmed(trimmed, childrenByGroup, oldNewIndexes, oldNewIndexMap);
  }

  /**
   * Apply grouping on data set
   * Clear grouping from source
   * If source came from other plugin
   */
  private onDataSet(data: BeforeSourceSetEvent) {
    if (!this.hasProps || !data?.source || !data.source.length) {
      return;
    }
    const source = data.source.filter(s => !isGrouping(s));
    const expanded = this.revogrid.grouping || {};
    const {
      sourceWithGroups,
      depth,
      trimmed,
      oldNewIndexMap,
      childrenByGroup,
    } = gatherGrouping(source, this.options?.props || [], {
      ...(expanded || {}),
    });
    data.source = sourceWithGroups;
    this.providers.data.setGrouping({ depth });
    this.updateTrimmed(trimmed, childrenByGroup, oldNewIndexMap);
  }

  // apply grouping
  setGrouping(options: GroupingOptions) {
    // unsubscribe from all events when group applied
    this.clearSubscriptions();
    this.options = options;
    // clear props, no grouping exists
    if (!options.props || !Object.keys(options.props).length) {
      this.clearGrouping();
      return;
    }
    // props exist and source inited
    const { source } = this.getSource();
    if (source.length) {
      this.doSourceUpdate({ ...options });
    }
    // props exist and columns inited
    for (let t of columnTypes) {
      if (this.setColumnGrouping(this.providers.column.getColumns(t))) {
        this.providers.column.refreshByType(t);
        break;
      }
    }

    // if has any grouping subscribe to events again
    this.subscribe();
  }

  // clear grouping
  clearGrouping() {
    // clear columns
    columnTypes.forEach(t => {
      const cols = this.providers.column.getColumns(t);
      let deleted = false;
      cols.forEach(c => {
        if (isGroupingColumn(c)) {
          delete c[PSEUDO_GROUP_COLUMN];
          deleted = true;
        }
      });
      // if column store had grouping clear and refresh
      if (deleted) {
        this.providers.column.refreshByType(t);
      }
    });
    // clear rows
    const { source, oldNewIndexes } = this.getSource(true);
    this.providers.data.setData(
      source,
      GROUPING_ROW_TYPE,
      this.revogrid.disableVirtualY,
      undefined,
      true,
    );
    this.updateTrimmed(undefined, undefined, oldNewIndexes);
  }

  private updateTrimmed(
    trimmedGroup: TrimmedEntity = {},
    _childrenByGroup: Record<number, number[]> = {},
    firstLevelMap: Record<number, number>,
    secondLevelMap?: Record<number, number>,
  ) {
    // map previously trimmed data
    const trimemedOptionsToUpgrade = processDoubleConversionTrimmed(
      this.trimmed,
      firstLevelMap,
      secondLevelMap,
    );
    for (let type in trimemedOptionsToUpgrade) {
      this.revogrid.addTrimmed(trimemedOptionsToUpgrade[type], type);
    }

    // const emptyGroups = this.filterOutEmptyGroups(trimemedOptionsToUpgrade, childrenByGroup);

    // setup trimmed data for grouping
    this.revogrid.addTrimmed({ ...trimmedGroup }, TRIMMED_GROUPING);
  }
}
