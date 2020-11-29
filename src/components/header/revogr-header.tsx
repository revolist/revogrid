import {Component, Element, Event, EventEmitter, h, Prop} from '@stencil/core';
import {HTMLStencilElement, VNode} from '@stencil/core/internal';
import {ObservableMap} from "@stencil/store";
import findIndex from 'lodash/findIndex';
import keyBy from 'lodash/keyBy';

import {HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS} from '../../utils/consts';
import {RevoGrid, Selection} from '../../interfaces';
import {Groups} from '../../store/dataSource/data.store';
import {getItemByIndex} from '../../store/dimension/dimension.helpers';
import HeaderRenderer from './headerRenderer';
import GroupHeaderRenderer from './headerGroupRenderer';

@Component({
  tag: 'revogr-header',
  styleUrl: 'revogr-header-style.scss'
})
export class RevogrHeaderComponent {
  @Element() element!: HTMLStencilElement;
  @Prop() viewportCol:  ObservableMap<RevoGrid.ViewportState>;
  @Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;
  @Prop() selectionStore: ObservableMap<Selection.SelectionStoreState>;

  @Prop() parent: string = '';
  @Prop() groups: Groups;
  @Prop() groupingDepth: number = 0;
  @Prop() canResize: boolean;
  @Prop() colData: RevoGrid.ColumnRegular[];

  @Event() initialHeaderClick: EventEmitter<{column: RevoGrid.ColumnRegular, index: number}>;
  @Event() headerResize: EventEmitter<RevoGrid.ViewSettingSizeProp>;
  @Event() headerDblClick: EventEmitter<{column: RevoGrid.ColumnRegular, index: number}>;

  private onResize({width}: {width?: number}, index: number): void {
    this.headerResize.emit({[index]: width || 0})
  }

  private onResizeGroup({changedX}: {changedX?: number}, startIndex: number, endIndex: number): void {
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
    const visibleProps: {[prop: string]: number} = {};

    // render header columns
    for (let col of cols) {
      const colData = this.colData[col.itemIndex];
      cells.push(
        <HeaderRenderer
          range={range}
          column={col}
          data={colData}

          canResize={this.canResize}
          onResize={(e) => this.onResize(e, col.itemIndex)}
          onDoubleClick={(data) => this.headerDblClick.emit(data)}
          onClick={(e) => this.initialHeaderClick.emit(e)}/>
      );
      visibleProps[colData?.prop] = col.itemIndex;
    }

    const groupRow = this.renderGroups(visibleProps);
    return [
      <div class='group-row'>{groupRow}</div>,
      <div class={`${HEADER_ROW_CLASS} ${HEADER_ACTUAL_ROW_CLASS}`}>{cells}</div>
    ];
  }

  renderGroups(visibleProps: {[prop: string]: number}): VNode[] {
    // render group columns
    const groupRow: VNode[] = [];
    for (let i = 0; i < this.groupingDepth; i++) {
      if (this.groups[i]) {
        for (let group of this.groups[i]) {
          // if group in visible range
          // find first visible group prop in visible columns range
          const indexFirstVisibleCol: number|undefined =
              findIndex(group.ids, (id) => typeof visibleProps[id] === 'number');
          if (indexFirstVisibleCol > -1) {
            const colVisibleIndex = visibleProps[group.ids[indexFirstVisibleCol]]; // get column index
            const groupStartIndex = colVisibleIndex - indexFirstVisibleCol; // first column index in group
            const groupEndIndex = groupStartIndex + group.ids.length - 1; // last column index in group

            // coordinates
            const groupStart = getItemByIndex(this.dimensionCol.state, groupStartIndex).start;
            const groupEnd = getItemByIndex(this.dimensionCol.state, groupEndIndex).end;
            groupRow.push(
              <GroupHeaderRenderer
                start={groupStart}
                end={groupEnd}
                group={group} 
                canResize={this.canResize}
                onResize={(e) => this.onResizeGroup(e, groupStartIndex, groupEndIndex)}
                />
            );
          }
        }
      }
      groupRow.push(<div class={`${HEADER_ROW_CLASS} group`}/>);
    }
    return groupRow;
  }
}
