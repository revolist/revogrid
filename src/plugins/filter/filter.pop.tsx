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
  private filterCaptionsInternal: FilterCaptions = {
    title: 'Filter by condition',
    save: 'Save',
    reset: 'Reset',
    cancel: 'Cancel',
  };
  @State() userInput: string;
  @State() isFilterIdSet = false;
  @State() filterId = 0;
  @State() currentFilterId: number = -1;
  @State() currentFilterType: FilterType = defaultType;
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
    const prop = this.changes?.prop;
    for (let gIndex in this.filterTypes) {
      options.push(
        <option selected={this.currentFilterType === defaultType} value={defaultType}>
          {prop && this.filterItems[prop] && this.filterItems[prop].length > 0 ? 'Select condition...' : this.filterNames[defaultType]}
        </option>,
      );

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

  renderExtra(prop: RevoGrid.ColumnProp) {
    if (this.filterEntities[this.currentFilterType].extra !== 'input') return '';

    if (!this.filterItems[prop]) return '';

    const index = this.filterItems[prop].findIndex(item => item.id === this.currentFilterId);
    if (index === -1) return '';

    return <input id="filter-input" type="text" value={this.userInput} onInput={this.onUserInput.bind(this, index, prop)} onKeyDown={e => this.onKeyDown(e)} />;
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
          const raquo = String.fromCharCode(187) + ' ';

          return (
            <div key={d.id} class={FILTER_LIST_CLASS}>
              <div>
                {d.id === this.currentFilterId ? raquo : ''}
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
          <select id="filter-select" class="select-css" onChange={e => this.onFilterChange(e)} onMouseUp={e => this.onDropdownClick(e)}>
            {this.renderConditions(this.changes.type)}
          </select>
          <div class={{ 'filter-input': true }}>{this.renderExtra(this.changes.prop)}</div>
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
    const el = e.target as HTMLSelectElement;
    const type = el.value as FilterType;

    this.currentFilterType = type;
    this.addNewFilterToProp();

    // focus on input after selecting from dropdown
    setTimeout(() => {
      const input = document.getElementById('filter-input') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  private onDropdownClick(e: MouseEvent) {
    // mouse event detail is 1 when the option is chosen
    if (e.detail !== 1) return;

    // if event detail is 0, the <select> element is clicked, resetting to defaultType
    const select = document.getElementById('filter-select') as HTMLSelectElement;
    if (select) {
      select.value = defaultType;
      this.currentFilterType = defaultType;
    }
  }

  private addNewFilterToProp() {
    if (!this.filterItems[this.changes.prop]) {
      this.filterItems[this.changes.prop] = [];
    }

    if (this.currentFilterType === 'none') return;

    this.filterId++;
    this.currentFilterId = this.filterId;

    this.filterItems[this.changes.prop].push({
      id: this.currentFilterId,
      type: this.currentFilterType,
      value: '',
      relation: 'and',
    });
    this.userInput = '';
  }

  private onUserInput(index: number, prop: RevoGrid.ColumnProp, event: Event) {
    // update the value of the input
    this.userInput = (event.target as HTMLInputElement).value;
    // update the value of the filter item
    this.filterItems[prop][index].value = this.userInput;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'enter') {
      // handle shift + enter on input to add new filter
      if (e.shiftKey) {
        const select = document.getElementById('filter-select') as HTMLSelectElement;
        if (select) {
          select.value = defaultType;
          this.currentFilterType = defaultType;
          this.addNewFilterToProp();
          select.focus();
        }
        return;
      }
      // save and emit filter when not pressing shift
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

    this.filterChange.emit(this.filterItems);
  }

  private onReset() {
    this.assertChanges();

    delete this.filterItems[this.changes.prop];

    // this updates the DOM which is used by getFilterItemsList() key
    this.filterId++;

    this.filterChange.emit(this.filterItems);
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
  }

  private assertChanges() {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
  }

  private isOutside(e: HTMLElement | null) {
    this.userInput = '';
    this.currentFilterType = defaultType;
    this.currentFilterId = -1;
    if (e.classList.contains(`[uuid="${this.uuid}"]`)) {
      return false;
    }
    return !e?.closest(`[uuid="${this.uuid}"]`);
  }
}
