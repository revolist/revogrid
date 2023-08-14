import { h, Host } from '@stencil/core';
import { Component, Prop, Event, EventEmitter } from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import DataStore from '../../store/dataSource/data.store';
import ViewportStore from '../../store/viewPort/viewport.store';
import { UUID } from '../../utils/consts';
import { ElementScroll } from '../revo-grid/viewport.scrolling.service';
import { ViewportData } from '../revo-grid/viewport.interfaces';
import { RowHeaderRender } from './row-header-render';



const LETTER_BLOCK_SIZE = 10;

@Component({ tag: 'revogr-row-headers' })
export class RevogrRowHeaders {
  @Prop() height: number;

  @Prop() dataPorts: ViewportData[];
  @Prop() headerProp: Record<string, any>;
  @Prop() uiid: string;

  @Prop() resize: boolean;
  @Prop() rowHeaderColumn: RevoGrid.RowHeaders;
  // @Event({ bubbles: false }) beforeRowAdd(y: number): EventEmitter<SelectionStore>;
  @Event({ bubbles: false }) scrollViewport: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  @Event({ bubbles: false }) elementToScroll: EventEmitter<ElementScroll>;

  render() {
    const dataViews: HTMLElement[] = [];
    const viewport = new ViewportStore();

    /** render viewports rows */
    let totalLength = 1;
    for (let data of this.dataPorts) {
      const items = data.dataStore.get('items')
      const itemCount = items.length;
      const source = data.dataStore.get('source')
      const visibleSourceItems = items.map(v => source[v]); // from src/store/dataSource/data.store.ts
      // initiate row data
      const dataStore = new DataStore<RevoGrid.DataType, RevoGrid.DimensionRows>(data.type);
      dataStore.updateData(visibleSourceItems);
      // initiate column data
      const colData = new DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>('colPinStart');
      const column = {
        cellTemplate: RowHeaderRender(totalLength),
        ...this.rowHeaderColumn,
      };
      colData.updateData([column]);

      const viewData = {
        ...data,
        dataStore: dataStore.store,
        colData: colData.store,
        viewportCol: viewport.store,
        readonly: true,
        range: false,
      };
      dataViews.push(<revogr-data {...viewData} />);
      totalLength += itemCount;
    }

    const colSize = this.rowHeaderColumn?.size || (totalLength.toString().length + 1) * LETTER_BLOCK_SIZE;
    viewport.setViewport({
      realCount: 1,
      virtualSize: 0,
      items: [
        {
          size: colSize,
          start: 0,
          end: colSize,
          itemIndex: 0,
        },
      ],
    });

    const parent = `${this.uiid}-rowHeaders`;
    const viewportScroll = {
      [UUID]: parent,
      contentHeight: this.height,
      contentWidth: 0,
      style: { minWidth: `${colSize}px` },
      ref: (el: ElementScroll) => this.elementToScroll.emit(el),
      onScrollViewport: (e: CustomEvent) => this.scrollViewport.emit(e.detail),
    };
    const viewportHeader = {
      ...this.headerProp,
      colData: typeof this.rowHeaderColumn === 'object' ? [this.rowHeaderColumn] : [],
      viewportCol: viewport.store,
      canResize: false,
      parent,
      slot: 'header',
    }
    return <Host class="rowHeaders" key="rowHeaders">
      <revogr-viewport-scroll {...viewportScroll}>
        <revogr-header {...viewportHeader} />
        {dataViews}
      </revogr-viewport-scroll>
    </Host>;
    }
}
