import { h } from '@stencil/core';

import type { ColumnProp, ColumnRegular, DataType, PluginProviders } from '@type';
import { BasePlugin } from '../base.plugin';
import { FILTER_PROP, isFilterBtn } from './filter.button';
import {
  filterCoreFunctionsIndexedByType,
  filterNames,
  filterTypes,
} from './filter.indexed';

import type {
  ColumnFilterConfig,
  FilterCollection,
  LogicFunction,
  MultiFilterItem,
} from './filter.types';

import { getCellDataParsed } from '../../utils';

export * from './filter.types';
export * from './filter.indexed';
export * from './filter.button';

export const FILTER_TRIMMED_TYPE = 'filter';
export const FILTER_CONFIG_CHANGED_EVENT = 'filterconfigchanged';
export const FILTE_PANEL = 'revogr-filter-panel';

/**
 * @typedef ColumnFilterConfig
 * @type {object}
 * @property {FilterCollection|undefined} collection - preserved filter data
 * @property {string[]|undefined} include - filters to be included, if defined everything else out of scope will be ignored
 * @property {Record<string, CustomFilter>|undefined} customFilters - hash map of {FilterType:CustomFilter}.
 * @property {FilterLocalization|undefined} localization - translation for filter popup captions.
 * @property {MultiFilterItem|undefined} multiFilterItems - data for multi filtering.
 * @property {boolean|undefined} disableDynamicFiltering - disables dynamic filtering. A way to apply filters on Save only.
 * A way to define your own filter types per column
 */
/**
 * @internal
 */

export class FilterPlugin extends BasePlugin {
  pop?: HTMLRevogrFilterPanelElement;
  filterCollection: FilterCollection = {};
  multiFilterItems: MultiFilterItem = {};

  filterByType: Record<string, string[]> =
    { ...filterTypes };
  filterNameIndexByType: Record<string, string> = {
    ...filterNames,
  };
  filterFunctionsIndexedByType: Record<string, LogicFunction> = {
    ...filterCoreFunctionsIndexedByType,
  };

  filterProp = FILTER_PROP;

  constructor(
    public revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    config?: ColumnFilterConfig,
  ) {
    super(revogrid, providers);
    if (config) {
      this.initConfig(config);
    }

    const existingNodes = this.revogrid.registerVNode.filter(
      n => typeof n === 'object' && n.$tag$ !== FILTE_PANEL,
    );
    this.revogrid.registerVNode = [
      ...existingNodes,
      <revogr-filter-panel
        filterNames={this.filterNameIndexByType}
        filterEntities={this.filterFunctionsIndexedByType}
        filterCaptions={config?.localization?.captions}
        onFilterChange={e => this.onFilterChange(e.detail)}
        onResetChange={e => this.onFilterReset(e.detail)}
        disableDynamicFiltering={config?.disableDynamicFiltering}
        ref={e => (this.pop = e)}
      > { this.extraContent() }</revogr-filter-panel>,
    ];

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
      if (Object.keys(this.multiFilterItems).length === 0) {
        this.onFilterReset();
        return;
      }
      await this.runFiltering(this.multiFilterItems);
    };
    this.addEventListener(
      'headerclick',
      (e: CustomEvent<HTMLRevoGridElementEventMap['headerclick']>) =>
        this.headerclick(e),
    );
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
  }

  extraContent(): any {
    return null;
  }

  initConfig(config: ColumnFilterConfig) {
    if (config.multiFilterItems) {
      this.multiFilterItems = { ...config.multiFilterItems };
    } else {
      this.multiFilterItems = {};
    }
    // Add custom filters
    if (config.customFilters) {
      for (let customFilterType in config.customFilters) {
        const cFilter = config.customFilters[customFilterType];
        if (!this.filterByType[cFilter.columnFilterType]) {
          this.filterByType[cFilter.columnFilterType] = [];
        }
        this.filterByType[cFilter.columnFilterType].push(customFilterType);
        this.filterFunctionsIndexedByType[customFilterType] = cFilter.func;
        this.filterNameIndexByType[customFilterType] = cFilter.name;
      }
    }

    // Add filterProp if provided in config
    if (config.filterProp) {
      this.filterProp = config.filterProp;
    }

    /**
     * which filters has to be included/excluded
     * convinient way to exclude system filters
     */
    const cfgInlcude = config.include;
    if (cfgInlcude) {
      const filters: Record<string, string[]> = {};

      for (let t in this.filterByType) {
        // validate filters, if appropriate function present
        const newTypes = this.filterByType[t].filter(
          f => cfgInlcude.indexOf(f) > -1,
        );
        if (newTypes.length) {
          filters[t] = newTypes;
        }
      }
      // if any valid filters provided show them
      if (Object.keys(filters).length > 0) {
        this.filterByType = filters;
      }
    }

    if (config.collection) {
      this.filterCollection = Object.fromEntries(
        Object.entries(config.collection).filter(
          ([, item]) => this.filterFunctionsIndexedByType[item.type],
        ),
      );
    } else {
      this.filterCollection = {};
    }

    if (config.localization) {
      if (config.localization.filterNames) {
        Object.entries(config.localization.filterNames).forEach(([k, v]) => {
          if (this.filterNameIndexByType[k] != void 0) {
            this.filterNameIndexByType[k] = v;
          }
        });
      }
    }
  }

  async headerclick(e: CustomEvent<ColumnRegular>) {
    const el = e.detail.originalEvent?.target as HTMLElement;
    if (!isFilterBtn(el)) {
      return;
    }
    e.preventDefault();
    if (!this.pop) {
      return;
    }

    // filter button clicked, open filter dialog
    const gridPos = this.revogrid.getBoundingClientRect();
    const buttonPos = el.getBoundingClientRect();
    const prop = e.detail.prop;

    this.pop.show({
      ...this.filterCollection[prop],
      x: buttonPos.x - gridPos.x,
      y: buttonPos.y - gridPos.y + buttonPos.height,
      autoCorrect: true,
      prop,
      filterTypes: this.getColumnFilter(e.detail.filter),
      filterItems: this.multiFilterItems,
    });
  }

  getColumnFilter(
    type?: boolean | string | string[],
  ): Record<string, string[]> {
    let filterType = 'string';
    if (!type) {
      return { [filterType]: this.filterByType[filterType] };
    }

    // if custom column filter
    if (this.isValidType(type)) {
      filterType = type;

      // if multiple filters applied
    } else if (typeof type === 'object' && type.length) {
      return type.reduce((r: Record<string, string[]>, multiType) => {
        if (this.isValidType(multiType)) {
          r[multiType] = this.filterByType[multiType];
        }
        return r;
      }, {});
    }
    return { [filterType]: this.filterByType[filterType] };
  }

  isValidType(type: any): type is string {
    return !!(typeof type === 'string' && this.filterByType[type]);
  }

  /**
   * Called on internal component change
   */
  async onFilterChange(filterItems: MultiFilterItem) {
    // store the filter items
    this.multiFilterItems = filterItems;

    // run the filtering when the items change
    this.runFiltering(this.multiFilterItems);
  }

  onFilterReset(prop?: ColumnProp) {
    delete this.multiFilterItems[prop ?? ''];
    this.onFilterChange(this.multiFilterItems);
  }

  /**
   * Triggers grid filtering
   */
  async doFiltering(
    collection: FilterCollection,
    source: DataType[],
    columns: ColumnRegular[],
    filterItems: MultiFilterItem,
  ) {
    const columnsToUpdate: ColumnRegular[] = [];

    /**
     * Loop through the columns and update the columns that need to be updated with the `hasFilter` property.
     */
    const columnByProp: Record<string, ColumnRegular> = {};
    columns.forEach(rgCol => {
      const column = { ...rgCol };
      const hasFilter = filterItems[column.prop];
      columnByProp[column.prop] = column;

      /**
       * If the column has a filter and it's not already marked as filtered, update the column.
       */
      if (column[this.filterProp] && !hasFilter) {
        delete column[this.filterProp];
        columnsToUpdate.push(column);
      }

      /**
       * If the column does not have a filter and it's marked as filtered, update the column.
       */

      if (!column[this.filterProp] && hasFilter) {
        columnsToUpdate.push(column);
        column[this.filterProp] = true;
      }
    });
    const itemsToTrim = this.getRowFilter(source, filterItems, columnByProp);
    // check is filter event prevented
    const { defaultPrevented, detail } = this.emit('beforefiltertrimmed', {
      collection,
      itemsToFilter: itemsToTrim,
      source,
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
    this.providers.column.updateColumns(columnsToUpdate);
    this.emit('afterfilterapply');
  }

  async clearFiltering() {
    this.multiFilterItems = {};
    await this.runFiltering(this.multiFilterItems);
  }

  async runFiltering(multiFilterItems: MultiFilterItem) {
    const collection: FilterCollection = {};

    // handle old filterCollection to return the first filter only (if any) from multiFilterItems
    const filterProps = Object.keys(multiFilterItems);

    for (const prop of filterProps) {
      // check if we have any filter for a column
      if (multiFilterItems[prop].length > 0) {
        const firstFilterItem = multiFilterItems[prop][0];
        collection[prop] = {
          filter: this.filterFunctionsIndexedByType[firstFilterItem.type],
          type: firstFilterItem.type,
          value: firstFilterItem.value,
        };
      }
    }

    this.filterCollection = collection;
    const columns = this.providers.column.getColumns();
    // run the filtering on the main source only
    const source = this.providers.data.stores['rgRow'].store.get('source');

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

  /**
   * Get trimmed rows based on filter
   */
  getRowFilter(
    rows: DataType[],
    filterItems: MultiFilterItem,
    columnByProp: Record<string, ColumnRegular>
  ): Record<number, boolean> {
    const propKeys = Object.keys(filterItems);

    const trimmed: Record<number, boolean> = {};
    let propFilterSatisfiedCount = 0;
    let lastFilterResults: boolean[] = [];

    // each rows
    rows.forEach((model, rowIndex) => {
      // check filter by column properties
      for (const prop of propKeys) {
        const propFilters = filterItems[prop];

        // reset the count of satisfied filters
        propFilterSatisfiedCount = 0;
        // reset the array of last filter results
        lastFilterResults = [];

        // testing each filter for a prop
        for (const [filterIndex, filterData] of propFilters.entries()) {
          // the filter LogicFunction based on the type
          const filterFunc = this.filterFunctionsIndexedByType[filterData.type];

          // THE MAGIC OF FILTERING IS HERE
          const column = columnByProp[prop];
          // If there is no column but user wants to filter by a property
          const value = column ? getCellDataParsed(model, columnByProp[prop]) : model[prop];
          // OR relation
          if (filterData.relation === 'or') {
            // reset the array of last filter results
            lastFilterResults = [];
            // if the filter is satisfied, continue to the next filter
            if (filterFunc(value, filterData.value)) {
              continue;
            }
            // if the filter is not satisfied, count it
            propFilterSatisfiedCount++;

          // AND relation
          } else {
            // 'and' relation will need to know the next filter
            // so we save this current filter to include it in the next filter
            lastFilterResults.push(!filterFunc(value, filterData.value));

            // check first if we have a filter on the next index to pair it with this current filter
            const nextFilterData = propFilters[filterIndex + 1];
            // stop the sequence if there is no next filter or if the next filter is not an 'and' relation
            if (!nextFilterData || nextFilterData.relation !== 'and') {
              // let's just continue since for sure propFilterSatisfiedCount cannot be satisfied
              if (lastFilterResults.indexOf(true) === -1) {
                // reset the array of last filter results
                lastFilterResults = [];
                continue;
              }

              // we need to add all of the lastFilterResults since we need to satisfy all
              propFilterSatisfiedCount += lastFilterResults.length;
              // reset the array of last filter results
              lastFilterResults = [];
            }
          }
        } // end of propFilters forEach

        // add to the list of removed/trimmed rows of filter condition is satisfied
        if (propFilterSatisfiedCount === propFilters.length) {
          trimmed[rowIndex] = true;
        }
      } // end of for-of propKeys
    });
    return trimmed;
  }
}
