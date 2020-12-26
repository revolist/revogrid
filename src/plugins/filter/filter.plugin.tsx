import { h } from "@stencil/core";
import BasePlugin from '../basePlugin';
import { RevoGrid } from "../../interfaces";
import { FILTER_BUTTON_CLASS } from "./filter.button";
import { FilterItem } from "./filter.pop";
import { filterEntities } from "./filter.service";

export type ColumnFilter = {};
type HeaderEvent = CustomEvent<RevoGrid.ColumnRegular>;

export default class FilterPlugin extends BasePlugin {
    private pop: HTMLRevogrFilterPanelElement;
    constructor(protected revogrid: HTMLRevoGridElement, uiid: string) {
        super(revogrid);
        const headerClick = (e: HeaderEvent) => this.headerClick(e);
        const beforeSourceSet = () => {
            // set any filters here if present
        };
        this.addEventListener('headerClick', headerClick);
        this.addEventListener('beforeSourceSet', beforeSourceSet);

        this.revogrid.registerVNode([
            <revogr-filter-panel
                uuid={`filter-${uiid}`}
                onFilterChange={e => this.onFilterChange(e.detail)}
                ref={(e) => this.pop = e}/>
        ]);
    }
    private headerClick(e: HeaderEvent) {
        const el = e.detail.originalEvent?.target as HTMLElement;
        if (!this.isFilterBtn(el)) {
           return; 
        }
        e.preventDefault();
        const gridPos = this.revogrid.getBoundingClientRect();
        const buttonPos = el.getBoundingClientRect();

        this.pop.show({
            x: buttonPos.x - gridPos.x,
            y: buttonPos.y - gridPos.y + buttonPos.height,
            prop: e.detail.prop
        });
    }

    private async onFilterChange(predicate: FilterItem) {
        let items = await this.revogrid.getSource();
        const filter = filterEntities[predicate.type];
        const indexes: Record<number, boolean> = items.reduce((result, v, index) => {
            if (!filter(v[predicate.prop], predicate.extra)) {
                result[index] = true;
            }
            return result;
        }, {});
        this.revogrid.trimmedRows = indexes;
    }

    private isFilterBtn(e: HTMLElement) {
        if (e.classList.contains(FILTER_BUTTON_CLASS)) {
            return true;
        }
        return e?.closest(`.${FILTER_BUTTON_CLASS}`);
    }
}
