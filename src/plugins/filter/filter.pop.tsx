import { Component, h, Host, Listen, Method, Prop, State, Event, EventEmitter } from "@stencil/core";
import { RevoGrid } from "../../interfaces";
import { filterCollection, filterEntities, FilterType, filterType } from "./filter.service";

export type FilterItem = {
    type: FilterType;
    prop?: RevoGrid.ColumnProp;
    extra?: string;
};

@Component({
    tag: 'revogr-filter-panel'
})
export class FilterPanel {
    private currentFilter: FilterItem = {
        type: 'none'
    };
    private extraElement: HTMLInputElement|undefined;
    @Prop({ mutable: true, reflect: true }) uuid: string;
    @State() isVisible: {x: number; y: number; prop: RevoGrid.ColumnProp}|undefined;
    @State() extra: string|undefined;
      /** Action finished */
    @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent): void {
        if (this.isVisible && !e.defaultPrevented) {
            if (this.isOutside(e.target as any)) {
                this.show();
            }
        }
    }
    @Method() async show(isVisible?: {x: number; y: number; prop: RevoGrid.ColumnProp}) {
        this.isVisible = isVisible;
        if (!isVisible) {
            this.close();
        }
    }

    @Event() filterChange: EventEmitter;

    renderConditions() {
        return filterCollection
            .string
            .map(k =>
                <option value={k} selected={this.currentFilter?.type === k}>{filterType[k]}</option>
            );
    }

    renderExtra(extra?: string) {
        this.extraElement = undefined;
        switch(extra) {
            case 'input':
                return <input type="text" ref={e => this.extraElement = e}/>;
            default:
                return '';
        }
    }

    render() {
        if (!this.isVisible) {
            return <Host style={{ display: 'none' }}></Host>;
        }
        const style = {
            display: 'block',
            left: `${this.isVisible.x}px`,
            top: `${this.isVisible.y}px`,
        };
        return <Host style={style}>
            <label>Filter by condition</label>
            <br/>
            <select onChange={e => this.onFilterChange(e)}>{this.renderConditions()}</select>
            <br/>
            <div>{this.renderExtra(this.extra)}</div>
            <button onClick={() => this.onSave()}>Save</button>
            <button onClick={() => this.onCancel()}>Cancel</button>
        </Host>;
    }

    private onFilterChange(e: Event) {
        const el = e.target as HTMLSelectElement;
        const val = el.value as FilterType;
        this.extra = filterEntities[val].extra;
        this.currentFilter.type = val;
    }

    private onCancel() {
        this.show();
    }

    private onSave() {
        this.filterChange.emit({
            ...this.currentFilter,
            prop: this.isVisible?.prop,
            extra: this.extraElement?.value?.trim()
        });
        this.show();
    }

    private close() {
        this.extraElement = undefined;
        this.currentFilter = {
            type: 'none'
        };
    }

    private isOutside(e: HTMLElement|null) {
        if (e.classList.contains(`[uuid="${this.uuid}"]`)) {
            return false;
        }
        return !(e)?.closest(`[uuid="${this.uuid}"]`);
    }
}

