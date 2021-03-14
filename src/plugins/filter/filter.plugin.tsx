import { h } from '@stencil/core';
import BasePlugin from '../basePlugin';
import { RevoGrid } from '../../interfaces';
import { FILTER_PROP, isFilterBtn } from './filter.button';
import { FilterItem } from './filter.pop';
import { filterEntities, filterNames, FilterType, filterTypes } from './filter.service';
import { LogicFunction } from './filter.types';

type CustomFilter = {
  columnFilterType: string; // property defined in column filter: string/number/abstract/enum...etc
  name: string;
  func: LogicFunction;
};

/**
 * @typedef ColumnFilterConfig
 * @type {object}
 * @property {FilterCollection|undefined} collection - preserved filter data
 * @property {string[]|undefined} include - filters to be included, if defined everything else out of scope will be ignored
 * @property {Record<string, CustomFilter>|undefined} customFilters - hash map of {FilterType:CustomFilter}.
 * A way to define your own filter types per column
 */
export type ColumnFilterConfig = {
  collection?: FilterCollection;
  include?: string[];
  customFilters?: Record<string, CustomFilter>;
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
    const headerClick = (e: HeaderEvent) => this.headerClick(e);
    const afterSourceSet = () => {
      if (Object.keys(this.filterCollection).length) {
        this.filterByProps(this.filterCollection);
      }
    };
    this.addEventListener('headerClick', headerClick);
    this.addEventListener('afterSourceSet', afterSourceSet);

    this.revogrid.registerVNode([
      <revogr-filter-panel
        uuid={`filter-${uiid}`}
        filterNames={this.possibleFilterNames}
        filterEntities={this.possibleFilterEntities}
        onFilterChange={e => this.onFilterChange(e.detail)}
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
  }

  private async headerClick(e: HeaderEvent) {
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
    this.filterByProps({ [filterItem.prop]: filterItem });
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
    const source = await this.revogrid.getSource();
    const columns = await this.revogrid.getColumns();
    const { defaultPrevented, detail } = this.emit('beforeFilterApply', { collection: this.filterCollection, source, columns });
    if (defaultPrevented) {
      return;
    }
    this.doFiltering(detail.collection, detail.source, detail.columns);
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
    const { defaultPrevented, detail } = this.emit('beforeFilterTrimmed', { collection, itemsToFilter, source: items });
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
}
