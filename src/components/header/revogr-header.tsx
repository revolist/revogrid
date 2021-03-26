import { Component, Element, Event, EventEmitter, h, Prop } from '@stencil/core';
import { HTMLStencilElement, VNode } from '@stencil/core/internal';
import keyBy from 'lodash/keyBy';

import { HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS } from '../../utils/consts';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { Groups } from '../../store/dataSource/data.store';
import HeaderRenderer from './headerRenderer';
import ColumnGroupsRenderer from '../../plugins/groupingColumn/columnGroupsRenderer';

@Component({
  tag: 'revogr-header',
  styleUrl: 'revogr-header-style.scss',
})
export class RevogrHeaderComponent {
  @Element() element!: HTMLStencilElement;
  @Prop() viewportCol: Observable<RevoGrid.ViewportState>;
  @Prop() dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() selectionStore: Observable<Selection.SelectionStoreState>;

  @Prop() parent: string = '';
  @Prop() groups: Groups;
  @Prop() groupingDepth: number = 0;
  @Prop() canResize: boolean;
  @Prop() colData: RevoGrid.ColumnRegular[];
  @Prop() columnFilter: boolean;

  @Event() initialHeaderClick: EventEmitter<RevoGrid.InitialHeaderClick>;
  @Event() headerResize: EventEmitter<RevoGrid.ViewSettingSizeProp>;
  @Event() headerDblClick: EventEmitter<RevoGrid.InitialHeaderClick>;

  private onResize({ width }: { width?: number }, index: number): void {
    this.headerResize.emit({ [index]: width || 0 });
  }

  private onResizeGroup(changedX: number, startIndex: number, endIndex: number): void {
    const sizes: RevoGrid.ViewSettingSizeProp = {};
    const cols = keyBy(this.viewportCol.get('items'), 'itemIndex');
    const change = changedX / (endIndex - startIndex + 1);
    for (let i = startIndex; i <= endIndex; i++) {
      const item = cols[i];
      if (item) {
        sizes[i] = item.size + change;
      }
    }
    this.headerResize.emit(sizes);
  }

  render(): VNode[] {
    const cols = this.viewportCol.get('items');
    const range = this.selectionStore?.get('range');
    const cells: VNode[] = [];
    const visibleProps: { [prop: string]: number } = {};

    // render header columns
    for (let rgCol of cols) {
      const colData = this.colData[rgCol.itemIndex];
      cells.push(
        <HeaderRenderer
          range={range}
          column={rgCol}
          data={colData}
          canFilter={!!this.columnFilter}
          canResize={this.canResize}
          onResize={e => this.onResize(e, rgCol.itemIndex)}
          onDoubleClick={e => this.headerDblClick.emit(e)}
          onClick={e => this.initialHeaderClick.emit(e)}
        />,
      );
      visibleProps[colData?.prop] = rgCol.itemIndex;
    }

    return [
      <div class="group-rgRow">
        <ColumnGroupsRenderer
          canResize={this.canResize}
          visibleProps={visibleProps}
          groups={this.groups}
          dimensionCol={this.dimensionCol.state}
          depth={this.groupingDepth}
          onResize={(changedX, startIndex, endIndex) => this.onResizeGroup(changedX, startIndex, endIndex)}
        />
      </div>,
      <div class={`${HEADER_ROW_CLASS} ${HEADER_ACTUAL_ROW_CLASS}`}>{cells}</div>,
    ];
  }
}
