// filter.panel.tsx

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
  Element as StencilElement,
} from '@stencil/core';
import debounce from 'lodash/debounce';

import { AndOrButton, isFilterBtn, ReorderButton, TrashButton } from './filter.button';
import '../../utils/closest.polifill';
import {
  FilterCaptions,
  FilterData,
  LogicFunction,
  MultiFilterItem,
  ShowData,
} from './filter.types';
import type { ColumnProp } from '@type';
import { FilterType } from './filter.indexed';
import {
  getFilterReorderId,
  moveFilterItem,
  setFilterReorderData,
} from './filter.reorder';

const defaultType: FilterType = 'none';

const FILTER_LIST_CLASS = 'multi-filter-list';
const FILTER_LIST_CLASS_ACTION = 'multi-filter-list-action';
const FILTER_ID = 'add-filter';
const VIEWPORT_PADDING = 8;

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
  private dialog?: HTMLDialogElement;
  private hasChanges = false;
  private filterCaptionsInternal: FilterCaptions = {
    title: 'Filter by',
    ok: 'Close',
    save: 'Save',
    // drops the filter
    reset: 'Reset',
    cancel: 'Cancel',
    add: 'Add condition',
    placeholder: 'Enter value...',
    and: 'and',
    or: 'or',
    filterCondition: 'Filter condition',
    removeFilter: 'Remove filter',
    reorderFilter: 'Reorder filter',
  };

  @StencilElement() element!: HTMLElement;
  @State() isFilterIdSet = false;
  @State() filterId = 0;
  @State() currentFilterId = -1;
  @State() currentFilterType: FilterType = defaultType;
  @State() changes: ShowData | undefined;
  @State() filterItems: MultiFilterItem = {};
  @State() draftFilter: FilterData | undefined;
  @State() draggedFilterId: number | undefined;
  @State() dragOverFilterId: number | undefined;
  @Prop() filterNames: Record<string, string> = {};
  @Prop() filterEntities: Record<string, LogicFunction> = {};
  @Prop() filterCaptions: Partial<FilterCaptions> | undefined;
  /**
   * Disables dynamic filtering. A way to apply filters on Save only
   */
  @Prop() disableDynamicFiltering = false;
  /**
   * If true, closes the filter panel when clicking outside
   */
  @Prop() closeOnOutsideClick = true;
  /**
   * Whether the filter panel allows the same operator more than once per column.
   */
  @Prop() allowDuplicateOperators = true;
  @Event() filterChange: EventEmitter<MultiFilterItem>;
  @Event() resetChange: EventEmitter<ColumnProp>;

  @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent) {
    // click on anything then select drops values to default
    if (!this.changes) {
      return;
    }
    const path = e.composedPath();
    const select = this.getAddFilterSelect();
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
      isOutside &&
      !this.isOwnFilterButton(e.target) &&
      this.closeOnOutsideClick
    ) {
      this.changes = undefined;
    }
  }

  @Method() async show(newEntity?: ShowData) {
    this.hasChanges = false;
    this.changes = newEntity;
    this.filterItems = this.cloneFilterItems(newEntity?.filterItems || {});
    this.draftFilter = undefined;
    if (this.changes) {
      this.changes.type = this.changes.type || defaultType;
      const prop = this.changes.prop;
      const propFilters = prop === undefined ? undefined : this.filterItems[prop];
      if (!propFilters?.length && this.changes.showDefaultFilter !== false) {
        const type = this.resolveDraftFilterType(
          this.changes.defaultFilterType,
        );
        if (type) {
          this.draftFilter = {
            id: ++this.filterId,
            type,
            value: '',
            relation: 'and',
          };
        }
      }
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
    if (prop === undefined) return '';

    const propFilters = (this.filterItems[prop] ?? []).map((filter, index) => ({
      filter,
      index,
      isDraft: false,
    }));
    if (this.draftFilter) {
      propFilters.push({
        filter: this.draftFilter,
        index: propFilters.length,
        isDraft: true,
      });
    }
    const visibleFilters = propFilters.filter(({ filter }) => !filter.hidden);
    const visibleFilterCount = visibleFilters.length;
    const capts = {
      ...this.filterCaptionsInternal,
      ...this.filterCaptions,
    };
    return (
      <div key={this.filterId}>
        <ul class="multi-filter-list-container">
          {propFilters.map(({ filter, index, isDraft }) => {
            let andOrButton;
            if (filter.hidden) {
              return;
            }

            // hide toggle button if there is only one filter and the last one
            if (visibleFilters[visibleFilterCount - 1]?.filter.id !== filter.id) {
              andOrButton = (
                <AndOrButton
                  text={filter.relation === 'and' ? capts.and : capts.or}
                  onClick={() => this.toggleFilterAndOr(filter.id)}
                />
              );
            }

            const extra = this.renderExtra(prop, index, isDraft);
            const isDragging = this.draggedFilterId === filter.id;
            const isDragOver = this.dragOverFilterId === filter.id && !isDragging;
            const canReorder = visibleFilterCount > 1 && !isDraft;

            return (
              <li
                key={filter.id}
                class={FILTER_LIST_CLASS}
                aria-label={`${capts.filterCondition} ${index + 1}`}
              >
                <div
                  class={{
                    'multi-filter-list-row': true,
                    'filter-row-drop-active': this.draggedFilterId !== undefined && !isDragging,
                    'filter-row-dragging': isDragging,
                    'filter-row-drag-over': isDragOver,
                  }}
                >
                  {canReorder ? (
                    <button
                      type="button"
                      class="filter-row-drop-target"
                      tabIndex={-1}
                      aria-label={`${capts.filterCondition} ${index + 1}`}
                      onDragOver={e => this.onFilterDragOver(e, filter.id)}
                      onDragLeave={() => this.onFilterDragLeave(filter.id)}
                      onDrop={e => this.onFilterDrop(e, prop, filter.id)}
                    />
                  ) : ''}
                  {canReorder ? (
                    <ReorderButton
                      ariaLabel={capts.reorderFilter}
                      dragging={isDragging}
                      dragOver={isDragOver}
                      onDragStart={e => this.onFilterDragStart(e, filter.id)}
                      onDragEnd={() => this.onFilterDragEnd()}
                      onKeyDown={e => this.onFilterReorderKeyDown(e, prop, filter.id)}
                    />
                  ) : ''}
                  <div class={{ 'select-input': true }}>
                    <select
                      class="select-css select-filter"
                      onChange={e =>
                        this.onFilterTypeChange(e, prop, index, isDraft)
                      }
                    >
                      {this.renderSelectOptions(
                        filter.type,
                        true,
                      )}
                    </select>
                    {extra ? <div class="filter-extra">{extra}</div> : ''}
                  </div>
                  <div class={FILTER_LIST_CLASS_ACTION}>
                    {andOrButton}
                    <TrashButton
                      ariaLabel={capts.removeFilter}
                      onClick={() => this.onRemoveFilter(filter.id)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {visibleFilterCount ? <div class="add-filter-divider" /> : ''}
      </div>
    );
  }

  componentDidRender() {
    this.syncDialog();
  }

  private syncDialog() {
    if (!this.dialog) {
      return;
    }

    if (!this.changes) {
      if (this.dialog.open) {
        this.dialog.close();
      }
      return;
    }

    if (!this.dialog.open) {
      this.dialog.show();
    }

    if (this.changes.autoCorrect !== false) {
      this.autoCorrect(this.dialog);
      requestAnimationFrame(() => this.autoCorrect(this.dialog));
    }
  }

  private autoCorrect(el?: HTMLElement | null) {
    if (!el || !this.changes) {
      return;
    }

    el.style.maxHeight = '';
    el.style.left = `${this.changes.x}px`;
    el.style.top = `${this.changes.y}px`;

    const pos = el.getBoundingClientRect();
    const anchorTop = this.changes.anchorY ?? this.changes.y;
    const anchorBottom = this.changes.y;
    const spaceAbove = Math.max(0, anchorTop - VIEWPORT_PADDING);
    const spaceBelow = Math.max(0, window.innerHeight - anchorBottom - VIEWPORT_PADDING);
    const openAbove = pos.height > spaceBelow && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      VIEWPORT_PADDING,
      openAbove ? spaceAbove : spaceBelow,
    );

    el.style.maxHeight = `${availableHeight}px`;

    const adjustedPos = el.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - adjustedPos.width - VIEWPORT_PADDING,
    );
    const maxTop = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - adjustedPos.height - VIEWPORT_PADDING,
    );
    const left = Math.min(Math.max(VIEWPORT_PADDING, this.changes.x), maxLeft);
    const top = openAbove
      ? Math.min(Math.max(VIEWPORT_PADDING, anchorTop - adjustedPos.height), maxTop)
      : Math.min(Math.max(VIEWPORT_PADDING, anchorBottom), maxTop);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  private onFilterTypeChange(
    e: Event,
    prop: ColumnProp,
    index: number,
    isDraft = false,
  ) {
    if (!(e.target instanceof HTMLSelectElement)) {
      return;
    }
    const type = e.target.value as FilterType;
    const filter = isDraft
      ? this.promoteDraft(prop, type)
      : this.filterItems[prop][index];
    if (!filter) {
      return;
    }
    filter.type = type;
    this.hasChanges = true;

    // this re-renders the input to know if we need extra input
    this.filterId++;

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById(
        'filter-input-' + filter.id,
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
    this.emitFilterChange();
  }, 400);

  private onAddNewFilter(e: Event) {
    const el = e.target as HTMLSelectElement;
    this.currentFilterType = el.value as FilterType;
    this.addNewFilterToProp();

    // reset value after adding new filter
    const select = this.getAddFilterSelect();
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
    if (this.draftFilter) {
      this.draftFilter.id = this.currentFilterId;
      this.draftFilter.type = this.currentFilterType;
      this.promoteDraft(prop);
    } else {
      this.filterItems[prop].push({
        id: this.currentFilterId,
        type: this.currentFilterType,
        value: '',
        relation: 'and',
      });
      this.hasChanges = true;
    }

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById(
        'filter-input-' + this.currentFilterId,
      ) as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  private onSave() {
    if (this.hasChanges) {
      this.emitFilterChange();
    }
  }

  private onCancel() {
    this.changes = undefined;
  }

  private onReset() {
    this.assertChanges();

    this.draftFilter = undefined;
    const prop = this.changes?.prop;
    if (prop !== undefined) {
      delete this.filterItems[prop];
    }
    this.resetChange.emit(prop);

    // this updates the DOM which is used by getFilterItemsList() key
    this.filterId++;
  }

  private onRemoveFilter(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes?.prop;

    if (this.draftFilter?.id === id) {
      this.draftFilter = undefined;
      return;
    }

    const items = this.filterItems[prop ?? ''];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;
    items.splice(index, 1);
    this.hasChanges = true;

    // let's remove the prop if no more filters so the filter icon will be removed
    if (items.length === 0) delete this.filterItems[prop ?? ''];

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private onFilterDragStart(e: DragEvent, id: number) {
    this.draggedFilterId = id;
    setFilterReorderData(e.dataTransfer, id);
  }

  private onFilterDragOver(e: DragEvent, id: number) {
    if (this.draggedFilterId === undefined || this.draggedFilterId === id) {
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    this.dragOverFilterId = id;
  }

  private onFilterDragLeave(id: number) {
    if (this.dragOverFilterId === id) {
      this.dragOverFilterId = undefined;
    }
  }

  private onFilterDrop(e: DragEvent, prop: ColumnProp, targetId: number) {
    e.preventDefault();
    const sourceId = this.draggedFilterId ?? getFilterReorderId(e.dataTransfer);
    this.onFilterDragEnd();

    if (sourceId === undefined) {
      return;
    }

    const items = this.filterItems[prop];
    if (!items) {
      return;
    }

    if (!moveFilterItem(items, sourceId, targetId)) {
      return;
    }

    this.hasChanges = true;
    this.filterId++;

    if (!this.disableDynamicFiltering) {
      this.debouncedApplyFilter();
    }
  }

  private onFilterDragEnd() {
    this.draggedFilterId = undefined;
    this.dragOverFilterId = undefined;
  }

  private onFilterReorderKeyDown(e: KeyboardEvent, prop: ColumnProp, sourceId: number) {
    let direction = 0;
    if (e.key === 'ArrowUp') {
      direction = -1;
    } else if (e.key === 'ArrowDown') {
      direction = 1;
    } else {
      return;
    }
    const items = this.filterItems[prop];
    if (!items) {
      return;
    }

    const visibleItems = items.filter(item => !item.hidden);
    const sourceIndex = visibleItems.findIndex(item => item.id === sourceId);
    if (sourceIndex === -1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const target = visibleItems[sourceIndex + direction];
    if (!target || !moveFilterItem(items, sourceId, target.id)) {
      return;
    }

    this.hasChanges = true;
    this.filterId++;

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
    this.hasChanges = true;
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
    if (prop === undefined) {
      return;
    }

    const hidden = new Set<string>();
    Object.keys(this.filterItems).forEach((prop) => {
      const values = this.filterItems[prop];
      values.forEach((filter) => {
        if (filter.hidden) {
          hidden.add(filter.type);
        }
      })
    });

    const selectedTypes = new Set<string>(
      (this.filterItems[prop] ?? [])
        .filter(filter => !filter.hidden)
        .map(filter => filter.type),
    );

    if (!isDefaultTypeRemoved) {
      const capts = {
        ...this.filterCaptionsInternal,
        ...this.filterCaptions,
      };

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
      const group = this.changes.filterTypes[gIndex].filter(k =>
        !hidden.has(k) && (
          this.allowDuplicateOperators ||
          !selectedTypes.has(k) ||
          (isDefaultTypeRemoved && type === k)
        ),
      );
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

  renderExtra(prop: ColumnProp, index: number, isDraft = false) {
    const currentFilter = isDraft
      ? this.draftFilter
      : this.filterItems[prop]?.[index];

    if (!currentFilter) return '';

    const applyFilter = (value?: any) => {
      currentFilter.value = value;
      if (isDraft && !this.isMeaningfulDraftValue(value)) {
        return;
      }
      if (isDraft && !this.promoteDraft(prop)) {
        return;
      }
      this.hasChanges = true;
      if (!this.disableDynamicFiltering) {
        this.debouncedApplyFilter();
      }
    };

    const focusNext = () => {
      const select = this.getAddFilterSelect();
      if (select) {
        select.value = defaultType;
        this.currentFilterType = defaultType;
        this.addNewFilterToProp();
        select.focus();
      }
    };

    const capts = {
      ...this.filterCaptionsInternal,
      ...this.filterCaptions,
    };
    const extra = this.filterEntities[currentFilter.type]?.extra;
    if (typeof extra === 'function') {
      return extra(h, {
        value: currentFilter.value,
        filter: currentFilter,
        prop,
        index,
        placeholder: capts.placeholder,
        onInput: (value: any) => {
          applyFilter(value);
        },
        onFocus: () => {
          focusNext();
        }
      });
    }
    if (extra !== 'input' && extra !== 'datepicker') {
      return '';
    }
    return (
      <input
        id={`filter-input-${currentFilter.id}`}
        placeholder={capts.placeholder}
        type={extra === 'datepicker' ? 'date' : 'text'}
        value={currentFilter.value}
        onInput={(e) => {
          if (e.target instanceof HTMLInputElement) {
            applyFilter(e.target.value);
          }
        }}
        onKeyDown={e => {
          if (e.key.toLowerCase() === 'enter') {
            const select = this.getAddFilterSelect();
            if (select) {
              focusNext();
            }
            return;
          }
          // keep event local, don't escalate farther to dom
          e.stopPropagation();
        }}
      />
    );
  }

  private resolveDraftFilterType(preferred?: string): FilterType | undefined {
    const available = Object.values(this.changes?.filterTypes ?? {}).flat();
    const type = preferred && available.includes(preferred)
      ? preferred
      : available[0];
    return type as FilterType | undefined;
  }

  private promoteDraft(prop: ColumnProp, type?: FilterType) {
    if (!this.draftFilter) {
      return;
    }
    if (!this.filterItems[prop]) {
      this.filterItems[prop] = [];
    }
    if (type) {
      this.draftFilter.type = type;
    }
    const filter = this.draftFilter;
    this.filterItems[prop].push(filter);
    this.draftFilter = undefined;
    this.hasChanges = true;
    return filter;
  }

  private isMeaningfulDraftValue(value: any) {
    return value !== '' && value !== undefined && value !== null;
  }

  private emitFilterChange() {
    this.filterChange.emit(this.cloneFilterItems(this.filterItems));
  }

  private cloneFilterItems(filterItems: MultiFilterItem): MultiFilterItem {
    return Object.fromEntries(
      Object.entries(filterItems).map(([prop, filters]) => [
        prop,
        filters.map(filter => ({ ...filter })),
      ]),
    );
  }

  private getAddFilterSelect() {
    return this.element.querySelector<HTMLSelectElement>(`#${FILTER_ID}`);
  }

  private isOwnFilterButton(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return false;
    }

    if (!isFilterBtn(target)) {
      return false;
    }

    const panelGrid = this.getOwningGrid(this.element);
    const targetGrid = this.getOwningGrid(target);

    return !!panelGrid && panelGrid === targetGrid;
  }

  private getOwningGrid(element: Element): Element | undefined {
    const grid = element.closest('revo-grid');
    if (grid) {
      return grid;
    }

    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.host.localName === 'revo-grid') {
      return root.host;
    }
    return undefined;
  }

  render() {
    const style = {
      left: `${this.changes?.x ?? 0}px`,
      top: `${this.changes?.y ?? 0}px`,
    };

    const capts = {
      ...this.filterCaptionsInternal,
      ...this.filterCaptions,
    };

    return (
      <Host>
        <dialog
          class="filter-panel-dialog"
          style={style}
          ref={el => (this.dialog = el)}
          onCancel={e => {
            e.preventDefault();
            this.onCancel();
          }}
        >
          {this.changes && [
            <slot key="header-slot" slot="header" />,
            this.changes.extraContent?.(this.changes) || '',

            this.changes?.hideDefaultFilters !== true && [
              <label key="filter-title">{capts.title}</label>,
              <div key="filter-holder" class="filter-holder">{this.getFilterItemsList()}</div>,
              <div key="add-filter" class="add-filter">
                <select
                  id={FILTER_ID}
                  class="select-css"
                  onChange={e => this.onAddNewFilter(e)}
                >
                  {this.renderSelectOptions(this.currentFilterType)}
                </select>
              </div>,
            ],

            <slot key="default-slot" />,
            this.changes.extraBottomContent?.(this.changes) || '',
            <div key="filter-actions" class="filter-actions">
              {this.disableDynamicFiltering && [
                <button
                  key="save"
                  type="button"
                  id="revo-button-save"
                  aria-label="save"
                  class="revo-button green"
                  onClick={() => this.onSave()}
                >
                  {capts.save}
                </button>,
                <button
                  key="cancel"
                  type="button"
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
                  key="ok"
                  type="button"
                  id="revo-button-ok"
                  aria-label="ok"
                  class="revo-button green"
                  onClick={() => this.onCancel()}
                >
                  {capts.ok}
                </button>,

                <button
                  key="reset"
                  type="button"
                  id="revo-button-reset"
                  aria-label="reset"
                  class="revo-button outline"
                  onClick={() => this.onReset()}
                >
                  {capts.reset}
                </button>,
              ]}
            </div>,
            <slot key="footer-slot" slot="footer" />,
          ]}
        </dialog>
      </Host>
    );
  }
}
