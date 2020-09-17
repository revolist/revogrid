import {Component, Element, Event, EventEmitter, h, Prop, Watch} from '@stencil/core';
import {HTMLStencilElement, VNode} from '@stencil/core/internal';
import {ObservableMap} from "@stencil/store";
import findIndex from 'lodash/findIndex';

import {HEADER_ACTUAL_ROW_CLASS, HEADER_CLASS, HEADER_ROW_CLASS} from '../../utils/consts';
import HeaderService from './headerService';
import {RevoGrid} from '../../interfaces';
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
  @Prop() cols: RevoGrid.VirtualPositionItem[];
  @Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

  @Prop() parent: string = '';
  @Prop() groups: Groups;
  @Prop() groupingDepth: number = 0;

  @Event() headerClick: EventEmitter<RevoGrid.ColumnDataSchemaRegular>;
  @Event() headerResize: EventEmitter<RevoGrid.ViewSettingSizeProp>;
  @Prop() canResize: boolean;

  @Prop() colData: RevoGrid.ColumnDataSchemaRegular[];
  private headerService: HeaderService;

  @Watch('colData') colChanged(newVal: RevoGrid.ColumnDataSchemaRegular[]): void {
    this.headerService.columns = newVal;
  }
  @Watch('canResize') onResizeChanged(newVal: boolean) {
    this.headerService.resizeChange(newVal);
  }

  connectedCallback(): void {
    this.headerService = new HeaderService(
        `${this.parent} .${HEADER_ACTUAL_ROW_CLASS} .${HEADER_CLASS}`,
        this.colData,
        {
          canResize: this.canResize,
          resize: (sizes: RevoGrid.ViewSettingSizeProp) => this.headerResize.emit(sizes)
        }
    );
  }

  disconnectedCallback(): void {
    this.headerService?.destroy();
  }

  render(): VNode[] {
    const cells: VNode[] = [];
    const visibleProps: {[prop: string]: number} = {};

    // render header columns
    for (let col of this.cols) {
      const colData = this.colData[col.itemIndex];
      cells.push(<HeaderRenderer column={col} data={colData} onClick={(e) => this.headerClick.emit(e)}/>);
      visibleProps[colData.prop] = col.itemIndex;
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
            
            groupRow.push(<GroupHeaderRenderer start={groupStart} end={groupEnd} group={group}/>);
          }
        }
      }
      groupRow.push(<div class={`${HEADER_ROW_CLASS} group`}/>);
    }
    return groupRow;
  }
}
