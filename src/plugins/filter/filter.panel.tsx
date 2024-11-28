import {
  h,
  Component,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  type VNode,
  Element,
} from '@stencil/core';
import debounce from 'lodash/debounce';

import { AndOrButton, isFilterBtn, TrashButton } from './filter.button';
import '../../utils/closest.polifill';
import {
  FilterCaptions,
  LogicFunction,
  MultiFilterItem,
  ShowData,
} from './filter.types';
import type { ColumnProp } from '@type';
import { FilterType } from './filter.indexed';

const defaultType: FilterType = 'none';

const FILTER_LIST_CLASS = 'multi-filter-list';
const FILTER_LIST_CLASS_ACTION = 'multi-filter-list-action';
const FILTER_ID = 'add-filter';

/**
 * Filter panel for editing filters
 */
/**
 * @internal
 */
@Component({
  tag: 'revogr-filter-panel',
  styleUrl: 'filter.style.scss',
})
export class FilterPanel {
  private filterCaptionsInternal: FilterCaptions = {
    title: 'Filter by',
    ok: 'Ok',
    save: 'Save',
    // drops the filter
    reset: 'Reset',
    cancel: 'Cancel',
    add: 'Add condition',
    placeholder: 'Enter value...',
    and: 'and',
    or: 'or',
  };

  @Element() element!: HTMLElement;
  @State() isFilterIdSet = false;
  @State() filterId = 0;
  @State() currentFilterId = -1;
  @State() currentFilterType: FilterType = defaultType;
  @State() changes: ShowData | undefined;
  @State() filterItems: MultiFilterItem = {};
  @Prop() filterNames: Record<string, string> = {};
  @Prop() filterEntities: Record<string, LogicFunction> = {};
  @Prop() filterCaptions: FilterCaptions | undefined;
  /**
   * Disables dynamic filtering. A way to apply filters on Save only
   */
  @Prop() disableDynamicFiltering = false;
  @Event() filterChange: EventEmitter<MultiFilterItem>;
  @Event() resetChange: EventEmitter<ColumnProp>;

  @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent) {
    // click on anything then select drops values to default
    if (!this.changes || e.defaultPrevented) {
      return;
    }
    const path = e.composedPath();
    const select = document.getElementById(FILTER_ID);
    if (select instanceof HTMLSelectElement) {
      // click on select should be skipped
      if (path.includes(select)) {
        return;
      }
      select.value = defaultType;
    }
    this.currentFilterType = defaultType;
    if (this.changes) {
      this.changes.type = defaultType;
    }
    this.currentFilterId = -1;

    const isOutside = !path.includes(this.element);

    if (
      e.target instanceof HTMLElement &&
      isOutside &&
      !isFilterBtn(e.target)
    ) {
      this.changes = undefined;
    }
  }

  @Method() async show(newEntity?: ShowData) {
    this.changes = newEntity;
    this.filterItems = newEntity?.filterItems || {};
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

  getFilterItemsList() {
    const prop = this.changes?.prop;
    if (typeof prop === 'undefined') return '';

    const propFilters = this.filterItems[prop] ?? [];
    const capts = Object.assign(
      this.filterCaptionsInternal,
      this.filterCaptions,
    );
    return (
      <div key={this.filterId}>
        {propFilters.map((filter, index) => {
          let andOrButton;
          if (filter.hidden) {
            return;
          }

          // hide toggle button if there is only one filter and the last one
          if (index !== this.filterItems[prop].length - 1) {
            andOrButton = (
              <div onClick={() => this.toggleFilterAndOr(filter.id)}>
                <AndOrButton
                  text={filter.relation === 'and' ? capts.and : capts.or}
                />
              </div>
            );
          }

          return (
            <div key={filter.id} class={FILTER_LIST_CLASS}>
              <div class={{ 'select-input': true }}>
                <select
                  class="select-css select-filter"
                  onChange={e => this.onFilterTypeChange(e, prop, index)}
                >
                  {this.renderSelectOptions(
                    this.filterItems[prop][index].type,
                    true,
                  )}
                </select>
                <div class={FILTER_LIST_CLASS_ACTION}>{andOrButton}</div>
                <div onClick={() => this.onRemoveFilter(filter.id)}>
                  <TrashButton />
                </div>
              </div>
              <div>{this.renderExtra(prop, index)}</div>
            </div>
          );
        })}

        {propFilters.filter(f => !f.hidden).length > 0 ? <div class="add-filter-divider" /> : ''}
      </div>
    );
  }

  private autoCorrect(el?: HTMLElement | null) {
    if (!el) {
      return;
    }
    const pos = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - pos.width;

    if (pos.left > maxLeft && el.offsetLeft) {
      el.style.left = `${maxLeft - (el.parentElement?.getBoundingClientRect().left ?? 0)}px`;
    }
  }

  private onFilterTypeChange(e: Event, prop: ColumnProp, index: number) {
    if (!(e.target instanceof HTMLSelectElement)) {
      return;
    }
    this.filterItems[prop][index].type = e.target.value as FilterType;

    // this re-renders the input to know if we need extra input
    this.filterId++;

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById(
        'filter-input-' + this.filterItems[prop][index].id,
      );
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }, 0);

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private debouncedApplyFilter = debounce(() => {
    this.filterChange.emit(this.filterItems);
  }, 400);

  private onAddNewFilter(e: Event) {
    const el = e.target as HTMLSelectElement;
    this.currentFilterType = el.value as FilterType;
    this.addNewFilterToProp();

    // reset value after adding new filter
    const select = document.getElementById('add-filter') as HTMLSelectElement;
    if (select) {
      select.value = defaultType;
      this.currentFilterType = defaultType;
    }

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private addNewFilterToProp() {
    const prop = this.changes?.prop;
    if (!(prop || prop === 0)) return;

    if (!this.filterItems[prop]) {
      this.filterItems[prop] = [];
    }

    if (this.currentFilterType === 'none') return;

    this.filterId++;
    this.currentFilterId = this.filterId;

    this.filterItems[prop].push({
      id: this.currentFilterId,
      type: this.currentFilterType,
      value: '',
      relation: 'and',
    });

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById(
        'filter-input-' + this.currentFilterId,
      ) as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  private onUserInput(index: number, prop: ColumnProp, event: Event) {
    // update the value of the filter item
    this.filterItems[prop][index].value = (
      event.target as HTMLInputElement
    ).value;

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'enter') {
      const select = document.getElementById('add-filter') as HTMLSelectElement;
      if (select) {
        select.value = defaultType;
        this.currentFilterType = defaultType;
        this.addNewFilterToProp();
        select.focus();
      }
      return;
    }
    // keep event local, don't escalate farther to dom
    e.stopPropagation();
  }

  private onSave() {
    this.filterChange.emit(this.filterItems);
  }

  private onCancel() {
    this.changes = undefined;
  }

  private onReset() {
    this.assertChanges();

    this.resetChange.emit(this.changes?.prop);

    // this updates the DOM which is used by getFilterItemsList() key
    this.filterId++;
  }

  private onRemoveFilter(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes?.prop;

    const items = this.filterItems[prop ?? ''];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;
    items.splice(index, 1);

    // let's remove the prop if no more filters so the filter icon will be removed
    if (items.length === 0) delete this.filterItems[prop ?? ''];

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private toggleFilterAndOr(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes?.prop;

    const items = this.filterItems[prop ?? ''];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;

    items[index].relation = items[index].relation === 'and' ? 'or' : 'and';
    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private assertChanges() {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
  }

  renderSelectOptions(type: FilterType, isDefaultTypeRemoved = false) {
    if (!this.changes) {
      return;
    }
    const options: VNode[] = [];
    const prop = this.changes.prop;

    const hidden = new Set<string>();
    Object.entries(this.filterItems).forEach(([_, values]) => {
      values.forEach((filter) => {
        if (filter.hidden) {
          hidden.add(filter.type);
        }
      })
    });

    if (!isDefaultTypeRemoved) {
      const capts = Object.assign(
        this.filterCaptionsInternal,
        this.filterCaptions,
      );

      options.push(
        <option
          selected={this.currentFilterType === defaultType}
          value={defaultType}
        >
          {prop && this.filterItems[prop] && this.filterItems[prop].length > 0
            ? capts.add
            : this.filterNames[defaultType]}
        </option>,
      );
    }

    for (let gIndex in this.changes.filterTypes) {
      const group = this.changes.filterTypes[gIndex].filter(k => !hidden.has(k));
      if (group.length) {
        options.push(
          ...group.map(k => (
            <option value={k} selected={type === k}>
              {this.filterNames[k]}
            </option>
          )),
        );
        options.push(<option disabled></option>);
      }
    }
    return options;
  }

  renderExtra(prop: ColumnProp, index: number) {
    const currentFilter = this.filterItems[prop];

    if (!currentFilter) return '';

    if (this.filterEntities[currentFilter[index].type].extra !== 'input')
      return '';

    const capts = Object.assign(
      this.filterCaptionsInternal,
      this.filterCaptions,
    );

    return (
      <input
        id={`filter-input-${currentFilter[index].id}`}
        placeholder={capts.placeholder}
        type="text"
        value={currentFilter[index].value}
        onInput={this.onUserInput.bind(this, index, prop)}
        onKeyDown={e => this.onKeyDown(e)}
      />
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

    const capts = Object.assign(
      this.filterCaptionsInternal,
      this.filterCaptions,
    );

    return (
      <Host
        style={style}
        ref={el => {
          this.changes?.autoCorrect && this.autoCorrect(el);
        }}
      >
        <slot slot="header" />
        { this.changes.extraContent?.(this.changes) || '' }

        { this.changes?.hideDefaultFilters !== true && (
          [
            <label>{capts.title}</label>,
            <div class="filter-holder">{this.getFilterItemsList()}</div>,
            <div class="add-filter">
              <select
                id={FILTER_ID}
                class="select-css"
                onChange={e => this.onAddNewFilter(e)}
              >
                {this.renderSelectOptions(this.currentFilterType)}
              </select>
            </div>
          ]
        )}

        <slot />
        <div class="filter-actions">
          {this.disableDynamicFiltering && [
            <button
              id="revo-button-save"
              aria-label="save"
              class="revo-button green"
              onClick={() => this.onSave()}
            >
              {capts.save}
            </button>,
            <button
              id="revo-button-ok"
              aria-label="ok"
              class="revo-button green"
              onClick={() => this.onCancel()}
            >
              {capts.cancel}
            </button>,
          ]}
          {!this.disableDynamicFiltering && [
            <button
              id="revo-button-ok"
              aria-label="ok"
              class="revo-button green"
              onClick={() => this.onCancel()}
            >
              {capts.ok}
            </button>,

            <button
              id="revo-button-reset"
              aria-label="reset"
              class="revo-button outline"
              onClick={() => this.onReset()}
            >
              {capts.reset}
            </button>,
          ]}
        </div>
        <slot slot="footer" />
      </Host>
    );
  }
}
