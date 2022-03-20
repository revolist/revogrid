import { h } from '@stencil/core';
import BasePlugin from '../basePlugin';
import { RevoGrid } from '../../interfaces';
import { FILTER_PROP, isFilterBtn } from './filter.button';
import { FilterItem, MultiFilterItem } from './filter.pop';
import { filterEntities, filterNames, FilterType, filterTypes } from './filter.service';
import { LogicFunction } from './filter.types';

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
 * A way to define your own filter types per column
 */
export type ColumnFilterConfig = {
  collection?: FilterCollection;
  include?: string[];
  customFilters?: Record<string, CustomFilter>;
  localization?: FilterLocalization;
};
type HeaderEvent = CustomEvent<RevoGrid.ColumnRegular>;
type FilterCollectionItem = {
  filter: LogicFunction;
  type: FilterType;
  value?: any;
};

export type FilterCollection = Record<RevoGrid.ColumnProp, FilterCollectionItem>;

export const FILTER_TRIMMED_TYPE = 'filter';

export default class FilterPlugin extends BasePlugin {
  private pop: HTMLRevogrFilterPanelElement;
  private filterCollection: FilterCollection = {};
  private possibleFilters: Record<string, string[]> = { ...filterTypes };
  private possibleFilterNames: Record<string, string> = { ...filterNames };
  private possibleFilterEntities: Record<string, LogicFunction> = { ...filterEntities };

  constructor(protected revogrid: HTMLRevoGridElement, uiid: string, config?: ColumnFilterConfig) {
    super(revogrid);
    if (config) {
      this.initConfig(config);
    }
    const headerclick = (e: HeaderEvent) => this.headerclick(e);
    const aftersourceset = () => {
      if (Object.keys(this.filterCollection).length) {
        this.filterByProps(this.filterCollection);
      }
    };
    this.addEventListener('headerclick', headerclick);
    this.addEventListener('aftersourceset', aftersourceset);

    this.revogrid.registerVNode([
      <revogr-filter-panel
        uuid={`filter-${uiid}`}
        filterNames={this.possibleFilterNames}
        filterEntities={this.possibleFilterEntities}
        filterCaptions={config?.localization?.captions}
        onFilterChange={e => this.onFilterChange(e.detail)}
        onMultiFilterChange={e => this.onMultiFilterChange(e.detail)}
        ref={e => (this.pop = e)}
      />,
    ]);
  }

  private initConfig(config: ColumnFilterConfig) {
    if (config.collection) {
      this.filterCollection = { ...config.collection };
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

    /**
     * which filters has to be included/excluded
     * convinient way to exclude system filters
     */
    if (config.include) {
      const filters: Record<string, string[]> = {};

      for (let t in this.possibleFilters) {
        // validate filters, if appropriate function present
        const newTypes = this.possibleFilters[t].filter(f => config.include.indexOf(f) > -1);
        if (newTypes.length) {
          filters[t] = newTypes;
        }
      }
      // if any valid filters provided show them
      if (Object.keys(filters).length > 0) {
        this.possibleFilters = filters;
      }
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

  private getColumnFilter(type?: boolean | string | string[]): Record<string, string[]> {
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
  private async onFilterChange(filterItem: FilterItem) {
    console.log('onFilterChange', filterItem);
    // this.filterByProps({ [filterItem.prop]: filterItem });
  }

  private async onMultiFilterChange(filterItems: MultiFilterItem) {
    console.log('onMultiFilterChange', filterItems);
    const { source, columns } = await this.getData();
    const { defaultPrevented, detail } = this.emit('beforefilterapply', { collection: this.filterCollection, source, columns });
    if (defaultPrevented) {
      return;
    }
    this.doMultiFiltering(detail.collection, detail.source, detail.columns, filterItems);
  }

  /**
   * Apply filters collection to extend existing one or override
   * @method
   * @param conditions - list of filters to apply
   */
  async filterByProps(conditions: Record<RevoGrid.ColumnProp, FilterItem>, override = false) {
    if (override) {
      this.filterCollection = {};
    }
    for (const prop in conditions) {
      const { type, value } = conditions[prop];
      if (type === 'none') {
        delete this.filterCollection[prop];
      } else {
        const filter = this.possibleFilterEntities[type];
        this.filterCollection[prop] = {
          filter,
          value,
          type,
        };
      }
    }
    await this.runFiltering();
  }

  /**
   * Triggers grid filtering
   */
  async doFiltering(collection: FilterCollection, items: RevoGrid.DataType[], columns: RevoGrid.ColumnRegular[]) {
    const columnsToUpdate: RevoGrid.ColumnRegular[] = [];
    // todo improvement: loop through collection of props
    columns.forEach(rgCol => {
      const column = { ...rgCol };
      const hasFilter = collection[column.prop];
      if (column[FILTER_PROP] && !hasFilter) {
        delete column[FILTER_PROP];
        columnsToUpdate.push(column);
      }
      if (!column[FILTER_PROP] && hasFilter) {
        columnsToUpdate.push(column);
        column[FILTER_PROP] = true;
      }
    });
    const itemsToFilter = this.getRowFilter(items, collection);
    // check is filter event prevented
    const { defaultPrevented, detail } = this.emit('beforefiltertrimmed', { collection, itemsToFilter, source: items });
    if (defaultPrevented) {
      return;
    }
    // check is trimmed event prevented
    const isAddedEvent = await this.revogrid.addTrimmed(detail.itemsToFilter, FILTER_TRIMMED_TYPE);
    if (isAddedEvent.defaultPrevented) {
      return;
    }
    await this.revogrid.updateColumns(columnsToUpdate);
    this.emit('afterFilterApply');
  }

  async doMultiFiltering(collection: FilterCollection, items: RevoGrid.DataType[], columns: RevoGrid.ColumnRegular[], filterItems: MultiFilterItem) {
    const columnsToUpdate: RevoGrid.ColumnRegular[] = [];
    // todo improvement: loop through collection of props
    columns.forEach(rgCol => {
      const column = { ...rgCol };
      const hasFilter = filterItems[column.prop];
      if (column[FILTER_PROP] && !hasFilter) {
        delete column[FILTER_PROP];
        columnsToUpdate.push(column);
      }
      if (!column[FILTER_PROP] && hasFilter) {
        columnsToUpdate.push(column);
        column[FILTER_PROP] = true;
      }
    });
    const itemsToFilter = this.getRowMultiFilter(items, filterItems);
    // check is filter event prevented
    const { defaultPrevented } = this.emit('beforefiltertrimmed', { collection, itemsToFilter, source: items });
    if (defaultPrevented) {
      return;
    }

    // const test = { 1: true };
    // check is trimmed event prevented
    const isAddedEvent = await this.revogrid.addTrimmed(itemsToFilter, FILTER_TRIMMED_TYPE);
    if (isAddedEvent.defaultPrevented) {
      return;
    }

    // applies the hasFilter to the columns to show filter icon
    await this.revogrid.updateColumns(columnsToUpdate);
    this.emit('afterFilterApply');
  }

  async clearFiltering() {
    this.filterCollection = {};
    await this.runFiltering();
  }

  private async runFiltering() {
    const { source, columns } = await this.getData();
    const { defaultPrevented, detail } = this.emit('beforefilterapply', { collection: this.filterCollection, source, columns });
    if (defaultPrevented) {
      return;
    }
    this.doFiltering(detail.collection, detail.source, detail.columns);
  }

  private async getData() {
    const source = await this.revogrid.getSource();
    const columns = await this.revogrid.getColumns();
    return {
      source,
      columns,
    };
  }

  private getRowFilter(rows: RevoGrid.DataType[], collection: FilterCollection) {
    const trimmed: Record<number, boolean> = {};
    rows.forEach((model, rowIndex) => {
      for (const prop in collection) {
        const filterItem = collection[prop];
        const filter = filterItem.filter;
        if (!filter(model[prop], filterItem.value)) {
          trimmed[rowIndex] = true;
        }
      }
    });
    return trimmed;
  }
  private getRowMultiFilter(rows: RevoGrid.DataType[], filterItems: MultiFilterItem) {
    const propKeys = Object.keys(filterItems);

    const trimmed: Record<number, boolean> = {};

    let filterResults: boolean[] = [];

    // each rows
    rows.forEach((model, rowIndex) => {




      // working on all props
      for (const prop of propKeys) {
        const propFilters = filterItems[prop];
        
        let propFilterSatisfiedCount = 0;

        // if (!Array.isArray(filterResults)) {
        //   filterResults = [];
        // }

        filterResults = [];

        // testing each filter for a prop
        propFilters.forEach((filterData, filterIndex) => {
          console.log('prop-' + prop + ': filter starts', prop, filterData.type, filterData.value, filterData.relation);
          // the filter LogicFunction based on the type
          const filter = filterEntities[filterData.type];

          // THE MAGIC OF FILTERING IS HERE

          if (filterData.relation === 'or') {
            filterResults = [];
            // console.log('test filter', filterData.type, model[prop], filterData.value, filter(model[prop], filterData.value));
            if (!filter(model[prop], filterData.value)) {
              // add to the last of removed/trimmed rows
              propFilterSatisfiedCount++;
            }
          } else if (filterData.relation === 'and') {
            console.log('prop-' + prop + ': FILTER RELATION AND === ', filterData.value);
            // 'and' relation will need to know the next filter
            // so we save this current filter to include it in the next filter
            filterResults.push(!filter(model[prop], filterData.value));

            console.log('prop-' + prop + ': filterResults LENGTH', filterResults.length);

            const nextFilterData = propFilters[filterIndex + 1];

            // check first if we have a filter on the next index to pair it with this current filter
            if (!(nextFilterData && nextFilterData.relation === 'and')) {
              console.log('prop-' + prop + ': add all filterResults', filterResults);
              // increase propFilterSatisfiedCount for each true result in filterResults
              if (filterResults.indexOf(true) >= 0) {
                console.log('prop-' + prop + ': AND relation satisfied REMOVE ROW');
                propFilterSatisfiedCount += filterResults.length;
              }
              filterResults = [];
            }

            // if (filterIndex !== propFilters.length - 1) {
            //   // not last of filters

            //   // get the next filterData

            // } else {
            //   // check if last of filters to ignore filter relation
            //   // console.log('LAST OF FILTERS. ignore filter', filterData.relation, filterData.value);
            //   if (!filter(model[prop], filterData.value)) {
            //     // add to the last of removed/trimmed rows
            //     propFilterSatisfiedCount++;
            //   }
            // }
          }
        }); // end of propFilters forEach

        console.log('prop-' + prop + ': filterResults', filterResults);

        console.log('prop-' + prop + ': TEST propFilterSatisfiedCount', propFilterSatisfiedCount, propFilters.length);

        // add to the list of removed/trimmed rows of filter condition is satisfied
        if (propFilterSatisfiedCount === propFilters.length) trimmed[rowIndex] = true;
      } // end of for-of propKeys
    });
    return trimmed;
  }
}
