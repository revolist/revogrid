import { Component, h, Host, Listen, Prop, State, Event, EventEmitter, VNode, Method } from '@stencil/core';
import { FilterType } from './filter.service';
import { RevoGrid } from '../../interfaces';
import { isFilterBtn } from './filter.button';
import { RevoButton } from '../../components/button/button';
import '../../utils/closestPolifill';
import { LogicFunction } from './filter.types';

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

export type ShowData = {
  x: number;
  y: number;
} & FilterItem;

const defaultType: FilterType = 'none';

@Component({
  tag: 'revogr-filter-panel',
  styleUrl: 'filter.style.scss',
})
export class FilterPanel {
  private extraElement: HTMLInputElement | undefined;
  @State() changes: ShowData | undefined;
  @Prop({ mutable: true, reflect: true }) uuid: string;
  @Prop() filterTypes: Record<string, string[]> = {};
  @Prop() filterNames: Record<string, string> = {};
  @Prop() filterEntities: Record<string, LogicFunction> = {};
  @Event() filterChange: EventEmitter<FilterItem>;
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
        return (
          <input
            type="text"
            value={value}
            onInput={ (e: InputEvent) => this.onInput(e) }
            onKeyDown={e => this.onKeyDown(e)}
            ref={e => (this.extraElement = e)}
          />
        );
      default:
        return '';
    }
  }

  render() {
    if (!this.changes || !this.changes) {
      return <Host style={{ display: 'none' }}></Host>;
    }
    const style = {
      display: 'block',
      left: `${this.changes.x}px`,
      top: `${this.changes.y}px`,
    };
    return (
      <Host style={style}>
        <label>Filter by condition</label>
        <select class="select-css" onChange={e => this.onFilterChange(e)}>
          {this.renderConditions(this.changes.type)}
        </select>
        <div>{this.renderExtra(this.filterEntities[this.changes.type].extra, this.changes.value)}</div>
        <RevoButton class={{ green: true }} onClick={() => this.onSave()}>
          Save
        </RevoButton>
        <RevoButton class={{ light: true }} onClick={() => this.onCancel()}>
          Cancel
        </RevoButton>
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
  }

  private onCancel() {
    this.changes = undefined;
  }

  private onSave() {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
    this.filterChange.emit({
      prop: this.changes.prop,
      type: this.changes.type,
      value: this.extraElement?.value?.trim(),
    });
    this.changes = undefined;
  }

  private isOutside(e: HTMLElement | null) {
    if (e.classList.contains(`[uuid="${this.uuid}"]`)) {
      return false;
    }
    return !e?.closest(`[uuid="${this.uuid}"]`);
  }
}
