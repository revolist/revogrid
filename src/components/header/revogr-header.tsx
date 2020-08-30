import {Component, Element, Event, EventEmitter, h, Prop, Watch} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from "@stencil/store";
import findIndex from 'lodash/findIndex';

import {DATA_COL, HEADER_CLASS} from '../../utils/consts';
import HeaderService from './headerService';
import {RevoGrid} from '../../interfaces';
import {Groups} from '../../store/dataSource/data.store';
import {getItemByIndex} from '../../store/dimension/dimension.helpers';

@Component({
  tag: 'revogr-header'
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
  @Watch('canResize') onResizeChanged(newVal: boolean) {
    this.headerService.resizeChange(newVal);
  }

  @Prop() colData: RevoGrid.ColumnDataSchemaRegular[];
  @Watch('colData') colChanged(newData: RevoGrid.ColumnDataSchemaRegular[]): void {
    this.headerService.columns = newData;
  }
  private headerService: HeaderService;

  connectedCallback(): void {
    this.headerService = new HeaderService(
        `${this.parent} .${HEADER_CLASS}`,
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

  render() {
    const cells: HTMLElement[] = [];
    const visibleProps: {[prop: string]: number} = {};

    // render header columns
    for (let col of this.cols) {
      const colData = this.colData[col.itemIndex];
      const dataProps = {
        [DATA_COL]: col.itemIndex,
        class: HEADER_CLASS,
        style: { width: `${col.size}px`, transform: `translateX(${col.start}px)` },
        onClick: () => this.headerClick.emit(this.colData[col.itemIndex])
      };
      cells.push(<div {...dataProps}>{colData.name}</div>);
      visibleProps[colData.prop] = col.itemIndex;
    }

    // render group columns
    const groupRow: HTMLElement[] = [];
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
            const groupProps = {
              class: HEADER_CLASS,
              style: {
                transform: `translateX(${groupStart}px)`,
                width: `${groupEnd - groupStart}px`
              }
            };
            groupRow.push(<div {...groupProps}>{group.name}</div>);
          }
        }
      }
      groupRow.push(<div class='header-row group'/>);
    }
    return [
      <div class='group-row'>{groupRow}</div>,
      <div class='header-row'>{cells}</div>
    ];
  }
}
