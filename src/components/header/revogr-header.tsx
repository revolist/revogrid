import { Component, Element, Event, EventEmitter, h, Prop } from '@stencil/core';
import { HTMLStencilElement, VNode } from '@stencil/core/internal';
import keyBy from 'lodash/keyBy';

import { HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS } from '../../utils/consts';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { Groups } from '../../store/dataSource/data.store';
import HeaderRenderer from './headerRenderer';
import ColumnGroupsRenderer from '../../plugins/groupingColumn/columnGroupsRenderer';
import { ResizeProps } from '../../services/resizable.directive';

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

  /**
   * If columns can be resized
   */
  @Prop() canResize: boolean;
  /**
   * Define custom resize position
   */
  @Prop() resizeHandler: ResizeProps['active'];
  @Prop() colData: RevoGrid.ColumnRegular[];
  @Prop() columnFilter: boolean;

  /**
   * Column type
   */
  @Prop() type!:  RevoGrid.DimensionCols | 'rowHeaders';

  /**
   * Extra properties to pass into header renderer, such as vue or react components to handle parent
   */
  @Prop() additionalData: any = {};

  @Event() initialHeaderClick: EventEmitter<RevoGrid.InitialHeaderClick>;
  @Event() headerresize: EventEmitter<RevoGrid.ViewSettingSizeProp>;
  @Event({ eventName: 'before-resize', cancelable: true }) beforeResize: EventEmitter<RevoGrid.ColumnRegular[]>;
  @Event() headerdblClick: EventEmitter<RevoGrid.InitialHeaderClick>;

  private onResize({ width }: { width?: number }, index: number): void {
    const col = this.colData[index];
    const event = this.beforeResize.emit([{
      ...col,
      size: width || undefined
    }]);
    if (event.defaultPrevented) {
      return;
    }
    this.headerresize.emit({ [index]: width || 0 });
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
    this.headerresize.emit(sizes);
  }

  render() {
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
          data={{
            ...colData,
            index: rgCol.itemIndex,
            providers: this.providers,
          }}
          canFilter={!!this.columnFilter}
          canResize={this.canResize}
          active={this.resizeHandler}
          onResize={e => this.onResize(e, rgCol.itemIndex)}
          onDoubleClick={e => this.headerdblClick.emit(e)}
          onClick={e => this.initialHeaderClick.emit(e)}
          additionalData={this.additionalData}
        />,
      );
      visibleProps[colData?.prop] = rgCol.itemIndex;
    }

    return [
      <div class="group-rgRow">
        <ColumnGroupsRenderer
          canResize={this.canResize}
          active={this.resizeHandler}
          visibleProps={visibleProps}
          providers={this.providers}
          groups={this.groups}
          dimensionCol={this.dimensionCol.state}
          depth={this.groupingDepth}
          onResize={(changedX, startIndex, endIndex) => this.onResizeGroup(changedX, startIndex, endIndex)}
          additionalData={this.additionalData}
        />
      </div>,
      <div class={`${HEADER_ROW_CLASS} ${HEADER_ACTUAL_ROW_CLASS}`}>{cells}</div>,
    ];
  }

  get providers(): RevoGrid.Providers {
    return {
      type: this.type,
      data: this.colData,
      viewport: this.viewportCol,
      dimension: this.dimensionCol,
      selection: this.selectionStore,
    };
  }
}
