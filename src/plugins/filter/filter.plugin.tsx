import { h } from "@stencil/core";
import { RevoGrid, RevoPlugin } from "../../interfaces";
import { FILTER_BUTTON_CLASS } from "./filter.button";
import { FilterItem } from "./filter.pop";
import { filterEntities } from "./filter.service";

export type ColumnFilter = {};
type HeaderEvent = CustomEvent<RevoGrid.InitialHeaderClick>;

export default class FilterPlugin implements RevoPlugin.Plugin {
    private readonly subscriptions: Record<string, ((e: CustomEvent) => void)> = {};
    private pop: HTMLRevogrFilterPanelElement;
    constructor(private revogrid: HTMLRevoGridElement, uiid: string) {
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
    private addEventListener(name: string, func: ((e: CustomEvent) => void)) {
        this.revogrid.addEventListener(name, func);
        this.subscriptions[name] = func;
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
        const indexes: Record<string, boolean> = items.reduce((result, v, index) => {
            if (filter(v[predicate.prop], predicate.extra)) {
                result[index] = true;
            }
            return result;
        }, {});
        console.log(indexes);
    }

    private isFilterBtn(e: HTMLElement) {
        if (e.classList.contains(FILTER_BUTTON_CLASS)) {
            return true;
        }
        return e?.closest(`.${FILTER_BUTTON_CLASS}`);
    }

    destroy() {
        for (let type in this.subscriptions) {
            this.revogrid.removeEventListener(type, this.subscriptions[type]);
        }
    }
}
