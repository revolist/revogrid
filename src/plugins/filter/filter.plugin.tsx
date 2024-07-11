import { h } from '@stencil/core';
import reduce from 'lodash/reduce';

import { BasePlugin } from '../base.plugin';
import { FILTER_PROP, isFilterBtn } from './filter.button';
import { MultiFilterItem } from './filter.pop';
import {
  filterEntities,
  filterNames,
  FilterType,
  filterTypes,
} from './filter.service';
import { LogicFunction } from './filter.types';
import { ColumnProp, ColumnRegular, DataType } from '@type';
import { PluginProviders } from '@type';

type CustomFilter = {
  columnFilterType: string; // property defined in column filter: string/number/abstract/enum...etc
  name: string;
  func: LogicFunction;
};

export type FilterCaptions = {
  title: string;
  save: string;
  reset: string;
  cancel: string;
};

export type FilterLocalization = {
  captions: FilterCaptions;
  filterNames: Record<FilterType, string>;
};

/**
 * @typedef ColumnFilterConfig
 * @type {object}
 * @property {FilterCollection|undefined} collection - preserved filter data
 * @property {string[]|undefined} include - filters to be included, if defined everything else out of scope will be ignored
 * @property {Record<string, CustomFilter>|undefined} customFilters - hash map of {FilterType:CustomFilter}.
 * @property {FilterLocalization|undefined} localization - translation for filter popup captions.
 * @property {MultiFilterItem|undefined} multiFilterItems - data for multi filtering.
 * @property {boolean|undefined} disableDynamicFiltering - disables dynamic filtering.
 * A way to define your own filter types per column
 */
/**
 * @internal
 */
export type ColumnFilterConfig = {
  collection?: FilterCollection;
  include?: string[];
  customFilters?: Record<string, CustomFilter>;
  filterProp?: string;
  localization?: FilterLocalization;
  multiFilterItems?: MultiFilterItem;
  disableDynamicFiltering?: boolean;
};
type HeaderEvent = CustomEvent<ColumnRegular>;
type FilterCollectionItem = {
  filter: LogicFunction;
  type: FilterType;
  value?: any;
};

export type FilterCollection = Record<ColumnProp, FilterCollectionItem>;

export const FILTER_TRIMMED_TYPE = 'filter';
export const FILTER_CONFIG_CHANGED_EVENT = 'filterconfigchanged';

export class FilterPlugin extends BasePlugin {
  private pop: HTMLRevogrFilterPanelElement;
  private filterCollection: FilterCollection = {};
  private multiFilterItems: MultiFilterItem = {};
  private possibleFilters: Record<string, string[]> = { ...filterTypes };
  private possibleFilterNames: Record<string, string> = { ...filterNames };
  private possibleFilterEntities: Record<string, LogicFunction> = {
    ...filterEntities,
  };
  private filterProp = FILTER_PROP;

  constructor(
    protected revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    uiid: string,
    config?: ColumnFilterConfig,
  ) {
    super(revogrid, providers);
    if (config) {
      this.initConfig(config);
    }

    const headerclick = (e: HeaderEvent) => this.headerclick(e);

    const aftersourceset = async () => {
      const filterCollectionProps = Object.keys(this.filterCollection);
      if (filterCollectionProps.length > 0) {
        // handle old way of filtering by reworking FilterCollection to new MultiFilterItem
        filterCollectionProps.forEach((prop, index) => {
          if (!this.multiFilterItems[prop]) {
            this.multiFilterItems[prop] = [
              {
                id: index,
                type: this.filterCollection[prop].type,
                value: this.filterCollection[prop].value,
                relation: 'and',
              },
            ];
          }
        });
      }
      await this.runFiltering();
    };
    this.addEventListener('headerclick', headerclick);
    this.addEventListener(
      FILTER_CONFIG_CHANGED_EVENT,
      ({ detail }: CustomEvent<ColumnFilterConfig | boolean>) => {
        if (!detail) {
          this.clearFiltering();
          return;
        }
        if (typeof detail === 'object') {
          this.initConfig(detail);
        }
        aftersourceset();
      },
    );
    this.addEventListener('aftersourceset', aftersourceset);
    this.addEventListener('filter', ({ detail }: CustomEvent) =>
      this.onFilterChange(detail),
    );

    const existingNodes = this.revogrid.registerVNode.filter((n) => n.$tag$ !== 'revogr-filter-panel');
    this.revogrid.registerVNode = [
      ...existingNodes,
      <revogr-filter-panel
        uuid={`filter-${uiid}`}
        filterItems={this.multiFilterItems}
        filterNames={this.possibleFilterNames}
        filterEntities={this.possibleFilterEntities}
        filterCaptions={config?.localization?.captions}
        onFilterChange={e => this.onFilterChange(e.detail)}
        disableDynamicFiltering={config?.disableDynamicFiltering}
        ref={e => (this.pop = e)}
      />,
    ];
  }

  private initConfig(config: ColumnFilterConfig) {
    if (config.multiFilterItems) {
      this.multiFilterItems = { ...config.multiFilterItems };
    }
    if (config.customFilters) {
      for (let cType in config.customFilters) {
        const cFilter = config.customFilters[cType];
        if (!this.possibleFilters[cFilter.columnFilterType]) {
          this.possibleFilters[cFilter.columnFilterType] = [];
        }
        this.possibleFilters[cFilter.columnFilterType].push(cType);
        this.possibleFilterEntities[cType] = cFilter.func;
        this.possibleFilterNames[cType] = cFilter.name;
      }
    }

    if (config.filterProp) {
      this.filterProp = config.filterProp;
    }

    /**
     * which filters has to be included/excluded
     * convinient way to exclude system filters
     */
    if (config.include) {
      const filters: Record<string, string[]> = {};

      for (let t in this.possibleFilters) {
        // validate filters, if appropriate function present
        const newTypes = this.possibleFilters[t].filter(
          f => config.include.indexOf(f) > -1,
        );
        if (newTypes.length) {
          filters[t] = newTypes;
        }
      }
      // if any valid filters provided show them
      if (Object.keys(filters).length > 0) {
        this.possibleFilters = filters;
      }
    }
    if (config.collection) {
      this.filterCollection = reduce(
        config.collection,
        (result: FilterCollection, item, prop) => {
          if (this.possibleFilterEntities[item.type]) {
            result[prop] = item;
          } else {
            console.warn(`${item.type} type is not found.`);
          }
          return result;
        },
        {},
      );
    }

    if (config.localization) {
      if (config.localization.filterNames) {
        Object.entries(config.localization.filterNames).forEach(([k, v]) => {
          if (this.possibleFilterNames[k] != void 0) {
            this.possibleFilterNames[k] = v;
          }
        });
      }
    }
  }

  private async headerclick(e: HeaderEvent) {
    const el = e.detail.originalEvent?.target as HTMLElement;
    if (!isFilterBtn(el)) {
      return;
    }
    e.preventDefault();

    // close if same
    const changes = await this.pop.getChanges();
    if (changes && changes?.prop === e.detail.prop) {
      this.pop.show();
      return;
    }

    // filter button clicked, open filter dialog
    const gridPos = this.revogrid.getBoundingClientRect();
    const buttonPos = el.getBoundingClientRect();
    const prop = e.detail.prop;
    this.pop.filterTypes = this.getColumnFilter(e.detail.filter);
    this.pop.show({
      ...this.filterCollection[prop],
      x: buttonPos.x - gridPos.x,
      y: buttonPos.y - gridPos.y + buttonPos.height,
      prop,
    });
  }

  private getColumnFilter(
    type?: boolean | string | string[],
  ): Record<string, string[]> {
    let filterType = 'string';
    if (!type) {
      return { [filterType]: this.possibleFilters[filterType] };
    }

    // if custom column filter
    if (this.isValidType(type)) {
      filterType = type;

      // if multiple filters applied
    } else if (typeof type === 'object' && type.length) {
      return type.reduce((r: Record<string, string[]>, multiType) => {
        if (this.isValidType(multiType)) {
          r[multiType] = this.possibleFilters[multiType];
        }
        return r;
      }, {});
    }
    return { [filterType]: this.possibleFilters[filterType] };
  }

  private isValidType(type: any): type is string {
    return !!(typeof type === 'string' && this.possibleFilters[type]);
  }

  // called on internal component change
  private async onFilterChange(filterItems: MultiFilterItem) {
    this.multiFilterItems = filterItems;
    this.runFiltering();
  }

  /**
   * Triggers grid filtering
   */
  async doFiltering(
    collection: FilterCollection,
    items: DataType[],
    columns: ColumnRegular[],
    filterItems: MultiFilterItem,
  ) {
    const columnsToUpdate: ColumnRegular[] = [];

    columns.forEach(rgCol => {
      const column = { ...rgCol };
      const hasFilter = filterItems[column.prop];
      if (column[this.filterProp] && !hasFilter) {
        delete column[this.filterProp];
        columnsToUpdate.push(column);
      }
      if (!column[this.filterProp] && hasFilter) {
        columnsToUpdate.push(column);
        column[this.filterProp] = true;
      }
    });
    const itemsToFilter = this.getRowFilter(items, filterItems);
    // check is filter event prevented
    const { defaultPrevented, detail } = this.emit('beforefiltertrimmed', {
      collection,
      itemsToFilter,
      source: items,
      filterItems,
    });
    if (defaultPrevented) {
      return;
    }

    // check is trimmed event prevented
    const isAddedEvent = await this.revogrid.addTrimmed(
      detail.itemsToFilter,
      FILTER_TRIMMED_TYPE,
    );
    if (isAddedEvent.defaultPrevented) {
      return;
    }

    // applies the hasFilter to the columns to show filter icon
    await this.revogrid.updateColumns(columnsToUpdate);
    this.emit('afterfilterapply');
  }

  async clearFiltering() {
    this.multiFilterItems = {};
    await this.runFiltering();
  }

  private async runFiltering() {
    const collection: FilterCollection = {};

    // handle old filterCollection to return the first filter only (if any) from multiFilterItems
    const filterProps = Object.keys(this.multiFilterItems);

    for (const prop of filterProps) {
      // check if we have any filter for a column
      if (this.multiFilterItems[prop].length > 0) {
        const firstFilterItem = this.multiFilterItems[prop][0];
        collection[prop] = {
          filter: filterEntities[firstFilterItem.type],
          type: firstFilterItem.type,
          value: firstFilterItem.value,
        };
      }
    }

    this.filterCollection = collection;

    const { source, columns } = await this.getData();
    const { defaultPrevented, detail } = this.emit('beforefilterapply', {
      collection: this.filterCollection,
      source,
      columns,
      filterItems: this.multiFilterItems,
    });
    if (defaultPrevented) {
      return;
    }
    this.doFiltering(
      detail.collection,
      detail.source,
      detail.columns,
      detail.filterItems,
    );
  }

  private async getData() {
    return {
      source: await this.revogrid.getSource(),
      columns: await this.revogrid.getColumns(),
    };
  }

  private getRowFilter(rows: DataType[], filterItems: MultiFilterItem) {
    const propKeys = Object.keys(filterItems);

    const trimmed: Record<number, boolean> = {};
    let propFilterSatisfiedCount = 0;
    let lastFilterResults: boolean[] = [];

    // each rows
    rows.forEach((model, rowIndex) => {
      // working on all props
      for (const prop of propKeys) {
        const propFilters = filterItems[prop];

        propFilterSatisfiedCount = 0;
        lastFilterResults = [];

        // testing each filter for a prop
        for (const [filterIndex, filterData] of propFilters.entries()) {
          // the filter LogicFunction based on the type
          const filter = this.possibleFilterEntities[filterData.type];

          // THE MAGIC OF FILTERING IS HERE
          if (filterData.relation === 'or') {
            lastFilterResults = [];
            if (filter(model[prop], filterData.value)) {
              continue;
            }
            propFilterSatisfiedCount++;
          } else {
            // 'and' relation will need to know the next filter
            // so we save this current filter to include it in the next filter
            lastFilterResults.push(!filter(model[prop], filterData.value));

            // check first if we have a filter on the next index to pair it with this current filter
            const nextFilterData = propFilters[filterIndex + 1];
            // stop the sequence if there is no next filter or if the next filter is not an 'and' relation
            if (!nextFilterData || nextFilterData.relation !== 'and') {
              // let's just continue since for sure propFilterSatisfiedCount cannot be satisfied
              if (lastFilterResults.indexOf(true) === -1) {
                lastFilterResults = [];
                continue;
              }

              // we need to add all of the lastFilterResults since we need to satisfy all
              propFilterSatisfiedCount += lastFilterResults.length;
              lastFilterResults = [];
            }
          }
        } // end of propFilters forEach

        // add to the list of removed/trimmed rows of filter condition is satisfied
        if (propFilterSatisfiedCount === propFilters.length)
          trimmed[rowIndex] = true;
      } // end of for-of propKeys
    });
    return trimmed;
  }
}
