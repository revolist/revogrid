import { h, Host, Component, Prop, Event, EventEmitter } from '@stencil/core';
import { JSXBase } from '@stencil/core/internal';

import { ViewportStore, DataStore } from '@store';

import { ROW_HEADER_TYPE } from '../../utils/consts';
import { RowHeaderRender } from './row-header-render';
import { calculateRowHeaderSize } from '../../utils/row-header-utils';
import { HEADER_SLOT } from '../revoGrid/viewport.helpers';
import {
  RowHeaders,
  ViewPortScrollEvent,
  DataType,
  ColumnRegular,
  ViewportData,
  ElementScroll,
  DimensionRows,
  DimensionCols,
} from '@type';
import { type JSX } from '../../components';

/**
 * Row headers component
 * Visible on the left side of the table
 */

@Component({ tag: 'revogr-row-headers' })
export class RevogrRowHeaders {
  // #region Properties
  /**
   * Header height to setup row headers
   */
  @Prop() height: number;

  /**
   * Viewport data
   */
  @Prop() dataPorts: ViewportData[];
  /**
   * Header props
   */
  @Prop() headerProp: Record<string, any>;

  /**
   * Row class
   */
  @Prop() rowClass: string;

  /**
   * Enable resize
   */
  @Prop() resize: boolean;
  /**
   * Row header column
   */
  @Prop() rowHeaderColumn: RowHeaders;
  /**
   * Additional data to pass to renderer
   */
  @Prop() additionalData: any;
  /**
   * Prevent rendering until job is done.
   * Can be used for initial rendering performance improvement.
   * When several plugins require initial rendering this will prevent double initial rendering.
   */
  @Prop() jobsBeforeRender: Promise<any>[] = [];
  // #endregion

  /**
   * Scroll viewport
   */
  @Event({ eventName: 'scrollview', bubbles: false })
  scrollViewport: EventEmitter<ViewPortScrollEvent>;
  /**
   * Register element to scroll
   */
  @Event({ eventName: 'ref', bubbles: false })
  elementToScroll: EventEmitter<ElementScroll>;

  render() {
    const dataViews: HTMLElement[] = [];
    const viewport = new ViewportStore('colPinStart');

    /** render viewports rows */
    let totalLength = 1;
    // todo: this part could be optimized to avoid to often re-render dataPorts can be cached
    for (let data of this.dataPorts) {
      const itemCount = data.dataStore.get('items').length;

      // initiate row data
      const dataStore = new DataStore<DataType, DimensionRows>(data.type, {
        ...data.dataStore.state,
      });

      // initiate column data
      const colData = new DataStore<ColumnRegular, DimensionCols>(
        'colPinStart',
      );
      const column: ColumnRegular = {
        cellTemplate: RowHeaderRender(totalLength),
        ...this.rowHeaderColumn,
      };
      colData.updateData([column]);
      dataViews.push(
        <revogr-data
          {...data}
          colType="rowHeaders"
          jobsBeforeRender={this.jobsBeforeRender}
          rowClass={this.rowClass}
          dataStore={dataStore.store}
          colData={colData.store}
          viewportCol={viewport.store}
          readonly={true}
          range={false}
        />,
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

    const viewportScroll: JSX.RevogrViewportScroll &
      JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement> = {
      contentHeight: this.height,
      contentWidth: 0,
      style: { minWidth: `${colSize}px` },
      colType: 'rowHeaders',
      ref: (el) => this.elementToScroll.emit(el),
      onScrollviewport: (e: CustomEvent) => this.scrollViewport.emit(e.detail),
    };
    const viewportHeader: JSX.RevogrHeader & { slot: string } = {
      ...this.headerProp,
      colData:
        typeof this.rowHeaderColumn === 'object' ? [this.rowHeaderColumn] : [],
      viewportCol: viewport.store,
      canResize: false,
      type: ROW_HEADER_TYPE,
      // parent,
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
