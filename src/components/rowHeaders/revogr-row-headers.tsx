import { h, Host } from '@stencil/core';
import { Component, Prop, Event, EventEmitter } from '@stencil/core';
import DataStore from '../../store/dataSource/data.store';
import ViewportStore from '../../store/viewport/viewport.store';
import { ROW_HEADER_TYPE, UUID } from '../../utils/consts';
import { ElementScroll } from '../revoGrid/viewport.scrolling.service';
import { RowHeaderRender } from './row-header-render';
import { calculateRowHeaderSize } from '../../utils/row-header-utils';
import { HEADER_SLOT } from '../revoGrid/viewport.helpers';
import { DimensionRows, DimensionCols } from '../../types/dimension';
import { RowHeaders, ViewPortScrollEvent, DataType, ColumnRegular } from '../../types/interfaces';
import { ViewportData } from '../../types/viewport.interfaces';
import { JSX } from '../..';

/**
 * Row headers component
 * Visible on the left side of the table
 */

@Component({ tag: 'revogr-row-headers' })
export class RevogrRowHeaders {
  @Prop() height: number;

  @Prop() dataPorts: ViewportData[];
  @Prop() headerProp: Record<string, any>;
  @Prop() uiid: string;
  @Prop() rowClass: string;

  @Prop() resize: boolean;
  @Prop() rowHeaderColumn: RowHeaders;
  /** Additional data to pass to renderer */
  @Prop() additionalData: any;

  @Event({ bubbles: false })
  scrollViewport: EventEmitter<ViewPortScrollEvent>;
  @Event({ bubbles: false }) elementToScroll: EventEmitter<ElementScroll>;

  render() {
    const dataViews: HTMLElement[] = [];
    const viewport = new ViewportStore('colPinStart');

    /** render viewports rows */
    let totalLength = 1;
    for (let data of this.dataPorts) {
      const itemCount = data.dataStore.get('items').length;
      // initiate row data
      const dataStore = new DataStore<
        DataType,
        DimensionRows
      >(data.type);
      dataStore.updateData(data.dataStore.get('source'));
      // initiate column data
      const colData = new DataStore<
        ColumnRegular,
        DimensionCols
      >('colPinStart');
      const column: ColumnRegular = {
        cellTemplate: RowHeaderRender(totalLength),
        ...this.rowHeaderColumn,
      };
      colData.updateData([column]);

      const viewData = {
        ...data,
        rowClass: this.rowClass,
        dataStore: dataStore.store,
        colData: colData.store,
        viewportCol: viewport.store,
        readonly: true,
        range: false,
      };
      dataViews.push(
        <revogr-data {...viewData}></revogr-data>,
      );
      totalLength += itemCount;
    }

    const colSize = calculateRowHeaderSize(totalLength, this.rowHeaderColumn);
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
    const viewportHeader: JSX.RevogrHeader & { slot: string } = {
      ...this.headerProp,
      colData:
        typeof this.rowHeaderColumn === 'object' ? [this.rowHeaderColumn] : [],
      viewportCol: viewport.store,
      canResize: false,
      type: ROW_HEADER_TYPE,
      parent,
      slot: HEADER_SLOT,
    };
    return (
      <Host class={{ [ROW_HEADER_TYPE]: true }} key={ROW_HEADER_TYPE}>
        <revogr-viewport-scroll {...viewportScroll} row-header={true}>
          <revogr-header {...viewportHeader} />
          {dataViews}
        </revogr-viewport-scroll>
      </Host>
    );
  }
}
