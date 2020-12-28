import { h } from '@stencil/core';
import BasePlugin from '../basePlugin';
import { RevoGrid } from '../../interfaces';
import { FILTER_PROP, isFilterBtn } from './filter.button';
import { FilterItem } from './filter.pop';
import { filterEntities, FilterType, filterTypes } from './filter.service';
import { LogicFunction } from './filter.types';

export type ColumnFilterConfig = {
    collection: FilterCollection;
    filters?: FilterType[];
};
type HeaderEvent = CustomEvent<RevoGrid.ColumnRegular>;
type FilterCollectionItem = {
    filter: LogicFunction;
    type: FilterType;
    value?: any;
};

export type FilterCollection = Record<RevoGrid.ColumnProp, FilterCollectionItem> ;

export default class FilterPlugin extends BasePlugin {
    private pop: HTMLRevogrFilterPanelElement;
    private filterCollection: FilterCollection = {};
    private possibleFilters: Record<string, FilterType[]> = {...filterTypes};
    constructor(protected revogrid: HTMLRevoGridElement, uiid: string, config?: ColumnFilterConfig) {
        super(revogrid);
        if (config) {
            this.initConfig(config);
        }
        const headerClick = (e: HeaderEvent) => this.headerClick(e);
        const beforeSourceSet = () => this.filterByProps(this.filterCollection);
        this.addEventListener('headerClick', headerClick);
        this.addEventListener('beforeSourceSet', beforeSourceSet);

        this.revogrid.registerVNode([
            <revogr-filter-panel
                uuid={`filter-${uiid}`}
                filterTypes={this.possibleFilters}
                onFilterChange={e => this.onFilterChange(e.detail)}
                ref={(e) => this.pop = e}/>
        ]);
    }

    private initConfig(config: ColumnFilterConfig) {
        if (config.collection) {
            this.filterCollection = {...config.collection};
        }
        if (config.filters) {
            const filters: Record<string, FilterType[]> = {};
            for (let t in filterTypes) {
                const newTypes = filterTypes[t].filter(f => config?.filters.indexOf(f) > -1);
                if (newTypes.length) {
                    filters[t] = newTypes;
                }
            }
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
        this.pop.show({
            ...this.filterCollection[prop],
            x: buttonPos.x - gridPos.x,
            y: buttonPos.y - gridPos.y + buttonPos.height,
            prop
        });
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
    filterByProps(conditions: Record<RevoGrid.ColumnProp, FilterItem>, override = false) {
        if (override) {
            this.filterCollection = {};
        }
        for (const prop in conditions) {
            const {type, value} = conditions[prop];
            if (type === 'none') {
                delete this.filterCollection[prop];
            } else {
                const filter = filterEntities[type];
                this.filterCollection[prop] = {
                    filter, value, type
                };
            }
        }
        const event = this.emit('beforeFilterApply', { collection:  this.filterCollection});
        if (event.defaultPrevented) {
            return;
        }
        this.doFiltering(event.detail.collection);
    }

    /**
     * Triggers grid filtering
     */
    async doFiltering(collection: FilterCollection) {
        const items = await this.revogrid.getSource();
        const columns = await this.revogrid.getColumns();
        const columnsToUpdate: RevoGrid.ColumnRegular[] = [];
        // todo improvement: loop through collection of props
        columns.forEach(c => {
            const hasFilter = collection[c.prop];
            if (c[FILTER_PROP] && !hasFilter) {
                delete c[FILTER_PROP];
                columnsToUpdate.push(c);
            }
            if (!c.filter && hasFilter) {
                columnsToUpdate.push(c);
                c[FILTER_PROP] = true;
            }
        });
        this.revogrid.trimmedRows = this.getIndexesToFilter(items, collection);
        this.revogrid.updateColumns(columnsToUpdate);
    }

    private getIndexesToFilter(rows: RevoGrid.DataType[], collection: FilterCollection) {
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
