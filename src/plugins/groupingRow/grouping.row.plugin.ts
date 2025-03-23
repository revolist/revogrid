import {
  getPhysical,
  setItems,
  columnTypes,
  type TrimmedEntity,
  type DSourceState,
} from '@store';
import type {
  BeforeSaveDataDetails,
  ColumnRegular,
  DataType,
  DimensionRows,
  PluginProviders,
} from '@type';

import { BasePlugin } from '../base.plugin';
import { FILTER_TRIMMED_TYPE } from '../filter/filter.plugin';

import type { Observable, ColumnCollection } from '../../utils';
import { SortingPlugin } from '../sorting/sorting.plugin';

import {
  GROUP_EXPAND_EVENT,
  GROUPING_ROW_TYPE,
  PSEUDO_GROUP_COLUMN,
} from './grouping.const';
import { doExpand, doCollapse } from './grouping.row.expand.service';
import type {
  BeforeSourceSetEvent,
  ExpandedOptions,
  GroupingOptions,
  OnExpandEvent,
} from './grouping.row.types';
import {
  gatherGrouping,
  getExpanded,
  getSource,
  isGrouping,
  isGroupingColumn,
} from './grouping.service';
import {
  processDoubleConversionTrimmed,
  TRIMMED_GROUPING,
} from './grouping.trimmed.service';

export * from './grouping.const';
export * from './grouping.row.expand.service';
export * from './grouping.row.types';
export * from './grouping.service';
export * from './grouping.row.renderer';


export class GroupingRowPlugin extends BasePlugin {
  private options: GroupingOptions | undefined;

  getStore(
    type: DimensionRows = GROUPING_ROW_TYPE,
  ): Observable<DSourceState<DataType, DimensionRows>> {
    return this.providers.data.stores[type].store;
  }

  constructor(
    revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
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
    const { source } = getSource(
      this.getStore().get('source'),
      this.getStore().get('proxyItems'),
    );
    let newTrimmed = this.getStore().get('trimmed')[TRIMMED_GROUPING];

    let i = getPhysical(this.getStore(), virtualIndex);
    const isExpanded = getExpanded(source[i]);
    if (!isExpanded) {
      const { trimmed, items } = doExpand(
        virtualIndex,
        source,
        this.getStore().get('items'),
      );
      newTrimmed = { ...newTrimmed, ...trimmed };
      if (items) {
        setItems(this.getStore(), items);
      }
    } else {
      const { trimmed } = doCollapse(i, source);
      newTrimmed = { ...newTrimmed, ...trimmed };
      this.revogrid.clearFocus();
    }

    this.getStore().set('source', source);
    this.revogrid.addTrimmed(newTrimmed, TRIMMED_GROUPING);
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
    const { source } = getSource(
      this.getStore().get('source'),
      this.getStore().get('proxyItems'),
    );
    const items = this.getStore().get('items');
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
      const source = this.getStore().get('source');
      for (let index in trimmed) {
        if (trimmed[index] && isGrouping(source[index])) {
          trimmed[index] = false;
        }
      }
    }
  }

  private isSortingRunning() {
    const sortingPlugin = this.providers.plugins.getByClass(SortingPlugin);
    return !!sortingPlugin?.sortingPromise;
  }

  /**
   * Starts global source update with group clearing and applying new one
   * Initiated when need to reapply grouping
   */
  private doSourceUpdate(options?: ExpandedOptions) {
    /**
     * Get source without grouping
     * @param newOldIndexMap - provides us mapping with new indexes vs old indexes, we would use it for trimmed mapping
     */
    const store = this.getStore();
    const { source, prevExpanded, oldNewIndexes } = getSource(
      store.get('source'),
      store.get('proxyItems'),
      true,
    );
    const expanded: ExpandedOptions = {
      prevExpanded,
      ...options,
    };
    /**
     * Group again
     * @param oldNewIndexMap - provides us mapping with new indexes vs old indexes
     */
    const {
      sourceWithGroups,
      depth,
      trimmed,
      oldNewIndexMap,
    } = gatherGrouping(source, this.options?.props || [], expanded);

    console.log('sourceWithGroups', gatherGrouping(source, this.options?.props || [], expanded))
    const customRenderer = options?.groupLabelTemplate;

    // setup source
    this.providers.data.setData(
      sourceWithGroups,
      GROUPING_ROW_TYPE,
      this.revogrid.disableVirtualY,
      { depth, customRenderer },
      true,
    );
    this.updateTrimmed(
      trimmed,
      oldNewIndexes ?? {},
      oldNewIndexMap,
    );
  }

  /**
   * Apply grouping on data set
   * Clear grouping from source
   * If source came from other plugin
   */
  private onDataSet(data: BeforeSourceSetEvent) {
    let preservedExpanded: ExpandedOptions['prevExpanded'] = {};
    if (this.options?.preserveGroupingOnUpdate !== false) {
      let { prevExpanded } = getSource(
        this.getStore().get('source'),
        this.getStore().get('proxyItems'),
        true,
      );
      preservedExpanded = prevExpanded;
    }
    const source = data.source.filter(s => !isGrouping(s));
    const options: ExpandedOptions = {
      ...(this.revogrid.grouping || {}),
      prevExpanded: preservedExpanded,
    };
    const {
      sourceWithGroups,
      depth,
      trimmed,
      oldNewIndexMap,
    } = gatherGrouping(source, this.options?.props || [], options);
    data.source = sourceWithGroups;
    this.providers.data.setGrouping({ depth });
    this.updateTrimmed(trimmed, oldNewIndexMap);
  }

  /**
   * External call to apply grouping. Called by revogrid when prop changed.
   */
  setGrouping(options: GroupingOptions) {
    // unsubscribe from all events when group applied
    this.clearSubscriptions();
    this.options = options;
    // clear props, no grouping exists
    if (!this.options?.props?.length) {
      this.clearGrouping();
      return;
    }
    // props exist and source initd
    const store = this.getStore();
    const { source } = getSource(
      store.get('source'),
      store.get('proxyItems'),
    );
    if (source.length) {
      this.doSourceUpdate({ ...options });
    }
    // props exist and columns initd
    for (let t of columnTypes) {
      if (this.setColumnGrouping(this.providers.column.getColumns(t))) {
        this.providers.column.refreshByType(t);
        break;
      }
    }

    // if has any grouping subscribe to events again
    /** if grouping present and new data source arrived */
    this.addEventListener('beforesourceset', ({ detail }) => {
      if (!(this.options?.props?.length && detail?.source?.length)) {
        return;
      }
      // if sorting is running don't apply grouping, wait for sorting, then it'll apply in @aftersortingapply
      if (this.isSortingRunning()) {
        return;
      }
      this.onDataSet(detail);
    });
    this.addEventListener('beforecolumnsset', ({ detail }) => {
      this.setColumns(detail);
    });

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
    this.addEventListener('aftersortingapply', () => {
      if (!this.options?.props?.length) {
        return;
      }
      this.doSourceUpdate({ ...this.options });
    });

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
    this.addEventListener(GROUP_EXPAND_EVENT, e => this.onExpand(e.detail));
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
    const { source, oldNewIndexes } = getSource(
      this.getStore().get('source'),
      this.getStore().get('proxyItems'),
      true,
    );
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
    firstLevelMap: Record<number, number> = {},
    secondLevelMap?: Record<number, number>,
  ) {
    // map previously trimmed data
    const trimemedOptionsToUpgrade = processDoubleConversionTrimmed(
      this.getStore().get('trimmed'),
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
