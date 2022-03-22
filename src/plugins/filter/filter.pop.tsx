import { Component, h, Host, Listen, Prop, State, Event, EventEmitter, VNode, Method } from '@stencil/core';
import { FilterType } from './filter.service';
import { RevoGrid } from '../../interfaces';
import { AndOrButton, isFilterBtn, TrashButton } from './filter.button';
import { RevoButton } from '../../components/button/button';
import '../../utils/closestPolifill';
import { LogicFunction } from './filter.types';
import { FilterCaptions } from './filter.plugin';

/**
 * @typedef FilterItem
 * @type {object}
 * @property {ColumnProp} prop - column id
 * @property {FilterType} type - filter type definition
 * @property {any} value - value for additional filtering, text value or some id
 */
export type FilterItem = {
  prop?: RevoGrid.ColumnProp;
  type?: FilterType;
  value?: any;
};

export type FilterData = {
  id: number;
  type: FilterType;
  value?: any;
  relation: 'and' | 'or';
};

export type MultiFilterItem = {
  [prop: string]: FilterData[];
};

export type ShowData = {
  x: number;
  y: number;
} & FilterItem;

const defaultType: FilterType = 'none';

const FILTER_LIST_CLASS = 'multi-filter-list';
const FILTER_LIST_CLASS_ACTION = 'multi-filter-list-action';

@Component({
  tag: 'revogr-filter-panel',
  styleUrl: 'filter.style.scss',
})
export class FilterPanel {
  private extraElement: HTMLInputElement | undefined;
  private filterCaptionsInternal: FilterCaptions = {
    title: 'Filter by condition',
    save: 'Save',
    reset: 'Reset',
    cancel: 'Cancel',
  };
  @State() isFilterIdSet = false;
  @State() filterId = 0;
  @State() changes: ShowData | undefined;
  @Prop({ mutable: true, reflect: true }) uuid: string;
  @Prop() filterItems: MultiFilterItem = {};
  @Prop() filterTypes: Record<string, string[]> = {};
  @Prop() filterNames: Record<string, string> = {};
  @Prop() filterEntities: Record<string, LogicFunction> = {};
  @Prop() filterCaptions: FilterCaptions | undefined;
  @Event() filterChange: EventEmitter<MultiFilterItem>;
  @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent): void {
    if (this.changes && !e.defaultPrevented) {
      const el = e.target as HTMLElement;
      if (this.isOutside(el) && !isFilterBtn(el)) {
        this.changes = undefined;
      }
    }
  }
  @Method() async show(newEntity?: ShowData) {
    this.changes = newEntity;
    if (this.changes) {
      this.changes.type = this.changes.type || defaultType;
    }
  }

  @Method() async getChanges() {
    return this.changes;
  }

  componentWillRender() {
    if (!this.isFilterIdSet) {
      this.isFilterIdSet = true;
      const filterItems = Object.keys(this.filterItems);
      for (const prop of filterItems) {
        // we set the proper filterId so there won't be any conflict when removing filters
        this.filterId += this.filterItems[prop].length;
      }
    }
  }

  renderConditions(type: FilterType) {
    const options: VNode[] = [];
    for (let gIndex in this.filterTypes) {
      options.push(<option value={defaultType}>{this.filterNames[defaultType]}</option>);

      options.push(
        ...this.filterTypes[gIndex].map(k => (
          <option value={k} selected={type === k}>
            {this.filterNames[k]}
          </option>
        )),
      );
      options.push(<option disabled></option>);
    }
    return options;
  }

  renderExtra(extra?: string, value?: any) {
    this.extraElement = undefined;
    switch (extra) {
      case 'input':
        return <input type="text" value={value} onInput={(e: InputEvent) => this.onInput(e)} onKeyDown={e => this.onKeyDown(e)} ref={e => (this.extraElement = e)} />;
      default:
        return '';
    }
  }

  getFilterItemsList() {
    return (
      <div key={this.filterId}>
        {(this.filterItems[this.changes.prop] || []).map((d, index) => {
          let andOrButton;

          // hide toggle button if there is only one filter and the last one
          if (index !== this.filterItems[this.changes.prop].length - 1) {
            andOrButton = (
              <div onClick={() => this.toggleFilterAndOr(d.id)}>
                <AndOrButton isAnd={d.relation === 'and'} />
              </div>
            );
          }

          return (
            <div key={d.id} class={FILTER_LIST_CLASS}>
              <div>
                {this.filterNames[d.type]}{' '}
                <strong>
                  <i>{d.value}</i>
                </strong>
              </div>
              <div class={FILTER_LIST_CLASS_ACTION}>
                {andOrButton}
                <div onClick={() => this.onRemoveFilter(d.id)}>
                  <TrashButton />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    if (!this.changes) {
      return <Host style={{ display: 'none' }}></Host>;
    }
    const style = {
      display: 'block',
      left: `${this.changes.x}px`,
      top: `${this.changes.y}px`,
    };

    const capts = Object.assign(this.filterCaptionsInternal, this.filterCaptions);

    return (
      <Host style={style}>
        <label>{capts.title}</label>
        {this.getFilterItemsList()}
        <div>
          <select class="select-css" onChange={e => this.onFilterChange(e)}>
            {this.renderConditions(this.changes.type)}
          </select>
          <div>{this.renderExtra(this.filterEntities[this.changes.type].extra, this.changes.value)}</div>
          <div class="center">
            <RevoButton class={{ green: true }} onClick={() => this.onSave()}>
              {capts.save}
            </RevoButton>
            <RevoButton class={{ red: true }} onClick={() => this.onReset()}>
              {capts.reset}
            </RevoButton>
            <RevoButton class={{ light: true }} onClick={() => this.onCancel()}>
              {capts.cancel}
            </RevoButton>
          </div>
        </div>
      </Host>
    );
  }

  private onFilterChange(e: Event) {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
    const el = e.target as HTMLSelectElement;
    const type = el.value as FilterType;
    this.changes = {
      ...this.changes,
      type,
    };
  }

  private onInput(e: InputEvent) {
    this.changes.value = (e.target as HTMLInputElement).value;
    // prevent grid focus and other unexpected events
    e.preventDefault();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'enter') {
      this.onSave();
    }
    // keep event local, don't escalate farther to dom
    e.stopPropagation();
  }

  private onCancel() {
    this.changes = undefined;
  }

  private onSave() {
    this.assertChanges();

    if (!this.filterItems[this.changes.prop]) {
      this.filterItems[this.changes.prop] = [];
    }

    this.filterItems[this.changes.prop].push({
      id: this.filterId++,
      type: this.changes.type,
      value: this.extraElement?.value?.trim(),
      relation: 'and',
    });

    this.filterChange.emit(this.filterItems);
  }

  private onReset() {
    this.assertChanges();

    delete this.filterItems[this.changes.prop];

    this.filterChange.emit(this.filterItems);

    this.changes = void 0;
  }

  private onRemoveFilter(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes.prop;

    const items = this.filterItems[prop];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;
    items.splice(index, 1);

    // let's remove the prop if no more filters so the filter icon will be removed
    if (items.length === 0) delete this.filterItems[prop];

    this.filterChange.emit(this.filterItems);
  }

  private toggleFilterAndOr(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes.prop;

    const items = this.filterItems[prop];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;

    items[index].relation = items[index].relation === 'and' ? 'or' : 'and';

    this.filterChange.emit(this.filterItems);
  }

  private assertChanges() {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
  }

  private isOutside(e: HTMLElement | null) {
    if (e.classList.contains(`[uuid="${this.uuid}"]`)) {
      return false;
    }
    return !e?.closest(`[uuid="${this.uuid}"]`);
  }
}
