import {Component, Prop, h, Host, Listen, Element, Event, EventEmitter, VNode, Method} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import each from 'lodash/each';

import '../../utils/closestPolifill';
import {UUID} from '../../utils/consts';
import {gatherColumnData, getStoresCoordinates, ViewportColumn} from './viewport.helpers';
import GridScrollingService from './gridScrollingService';
import {ViewportSpace} from './viewport.interfaces';
import {DataSourceState} from '../../store/dataSource/data.store';
import SelectionStoreConnector from '../../services/selection.store.connector';
import {Edition, Selection, RevoGrid} from '../../interfaces';
import OrderRenderer, { OrdererService } from '../order/orderRenderer';
import { columnTypes } from '../../store/storeTypes';

import RevogrRowHeaders from '../rowHeaders/revogr-row-headers';
import { ColumnFilter } from '../../plugins/filter/filter.plugin';

import ViewportProps = ViewportSpace.ViewportProps;

@Component({
  tag: 'revogr-viewport',
  styleUrl: 'revogr-viewport-style.scss'
})
export class RevogrViewport {
  @Element() element: HTMLElement;
  private scrollingService: GridScrollingService;
  private selectionStoreConnector: SelectionStoreConnector;

  private orderService: OrdererService;

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  @Prop() columnStores: {[T in RevoGrid.DimensionCols]: ObservableMap<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>};
  @Prop() rowStores: {[T in RevoGrid.DimensionRows]: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>};
  @Prop() dimensions: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.DimensionSettingsState>};
  @Prop() viewports: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.ViewportState>};
  
  /** Custom editors register  */
  @Prop() editors: Edition.Editors;
  @Prop() rowClass: string;

  @Prop() uuid: string|null = null;
  @Prop() resize: boolean;
  @Prop() readonly: boolean;
  @Prop() range: boolean;
  /** Show row indexes column */
  @Prop() rowHeaders: RevoGrid.RowHeaders|boolean;
  @Prop() columnFilter: boolean|ColumnFilter;

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  @Event() setDimensionSize: EventEmitter<{type: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp}>;
  @Event() setViewportCoordinate: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  @Event() setViewportSize: EventEmitter<RevoGrid.ViewPortResizeEvent>;
  @Event({ cancelable: true }) initialRowDragStart: EventEmitter<{pos: RevoGrid.PositionItem, text: string}>;



  
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------

  /** Clear data which is outside of grid container */
  @Listen('click', { target: 'document' })
  handleOutsideClick(e: KeyboardEvent) {
    const target: HTMLElement|null = e.target as HTMLElement;
    if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
      this.selectionStoreConnector.clearAll();
    }
  }

  /** DRAG AND DROP */
  @Listen('internalRowDragStart')
  onRowDragStarted(e: CustomEvent<{pos: RevoGrid.PositionItem, text: string, event: MouseEvent}>) {
    e.cancelBubble = true;
    const dragEvent = this.initialRowDragStart.emit({ ...e.detail });
    if (dragEvent.defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.orderService?.start(this.element, { ...e.detail, ...dragEvent.detail });
  }

  @Listen('internalRowDragEnd')
  onRowDragEnd() {
    this.orderService?.end();
  }

  @Listen('internalRowDrag')
  onRowDrag({detail}: CustomEvent<RevoGrid.PositionItem>) {
    this.orderService?.move(detail);
  }

  @Listen('internalRowMouseMove')
  onRowMouseMove(e: CustomEvent<Selection.Cell>): void {
    e.cancelBubble = true;
    this.orderService?.moveTip(e.detail);
  }
  
  
  // --------------------------------------------------------------------------
  //
  //  Methods
  //
  // --------------------------------------------------------------------------

  @Method() async scrollToCoordinate(cell: Partial<Selection.Cell>): Promise<void> {
    each(cell, (coordinate: number, key: keyof Selection.Cell) => {
      if (key === 'x') {
        this.scrollingService.onScroll({ dimension: 'col', coordinate });
      } else {
        this.scrollingService.onScroll({ dimension: 'row', coordinate });
      }
    });
  }
  
  @Method() async setEdit(rowIndex: number, colIndex: number, colType: RevoGrid.DimensionCols, rowType: RevoGrid.DimensionRows ): Promise<void> {
    const stores = getStoresCoordinates(this.columnStores, this.rowStores);
    const x = stores[colType];
    const y = stores[rowType];
    this.selectionStoreConnector?.setEditByCell({ x, y }, { x: colIndex, y: rowIndex });
  }

  /** Component */
  connectedCallback(): void {
    this.selectionStoreConnector = new SelectionStoreConnector();
    this.scrollingService = new GridScrollingService(
      (e: RevoGrid.ViewPortScrollEvent) => this.setViewportCoordinate.emit(e));
  }

  private renderViewports(contentHeight: number): VNode[] {
    this.scrollingService?.unregister();
    const viewports: ViewportProps[] = [];
    let index: number = 0;

    columnTypes.forEach((val) => {
      const colStore = this.columnStores[val];
      // only columns that have data show
      if (!colStore.get('items').length) {
        return;
      }
      const column: ViewportColumn = {
        colType: val,
        position: { x: index, y: 1 },


        contentHeight: contentHeight,
        fixWidth: val !== 'col',
        uuid: `${this.uuid}-${index}`,

        viewports: this.viewports,
        dimensions: this.dimensions,
        rowStores: this.rowStores,

        colStore,
        onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) =>
          this.setDimensionSize.emit({ type: val, sizes: e.detail })
      };
      if (val === 'col') {
        column.onResizeViewport = (e: CustomEvent<RevoGrid.ViewPortResizeEvent>) =>
          this.setViewportSize.emit(e.detail);
      }
      viewports.push(gatherColumnData(column));
      index++;
    });

    const viewPortHtml: VNode[] = [];

    if (this.rowHeaders) {
      viewPortHtml.push(<RevogrRowHeaders
        selectionStoreConnector={this.selectionStoreConnector}
        height={contentHeight}
        anyView={viewports[0]}
        resize={this.resize}
        rowHeaderColumn={typeof this.rowHeaders === 'object' ? this.rowHeaders : undefined}
        onScrollViewport={e => this.scrollingService.onScroll(e, 'headerRow')}
        onElementToScroll={e => this.scrollingService.registerElement(e, 'headerRow')}/>);
    }

    /** render viewports columns */
    for (let view of viewports) {
      const dataViews: HTMLElement[] = [];
      let j = 0;
      const colSelectionStore = this.selectionStoreConnector.registerColumn(view.position.x);

      /** render viewports rows */
      for (let data of view.dataPorts) {
        const rowSelectionStore = this.selectionStoreConnector.registerRow(data.position.y);
        const selectionStore = this.selectionStoreConnector.register(data.position);
        selectionStore.setLastCell(data.lastCell);
        dataViews.push(
          <revogr-overlay-selection
            {...data}
            slot={data.slot}
            selectionStore={selectionStore.store}
            editors={this.editors}
            readonly={this.readonly}
            range={this.range}

            onSetEdit={(e) => this.selectionStoreConnector.setEdit(e.detail)}
            onSetRange={(e) => selectionStore.setRangeArea(e.detail)}
            onSetTempRange={e => selectionStore.setTempArea(e.detail)}
            onChangeSelection={(e) => this.selectionStoreConnector.change(e.detail)}
            onFocusCell={(e) => this.selectionStoreConnector.focus(selectionStore, e.detail)}
            onInternalFocusCell={() => selectionStore.clearFocus()}
            onUnregister={() => this.selectionStoreConnector.unregister(selectionStore)}>

            <revogr-data
              {...data}
              {...{[UUID]: data.uuid}}
              key={view.prop.key + (++j)}
              readonly={this.readonly}
              range={this.range}
              rowClass={this.rowClass}
              rowSelectionStore={rowSelectionStore.store}
              slot='data'/>
            <revogr-temp-range selectionStore={selectionStore.store} dimensionRow={data.dimensionRow} dimensionCol={data.dimensionCol}/>
            <revogr-focus selectionStore={selectionStore.store} dimensionRow={data.dimensionRow} dimensionCol={data.dimensionCol}/>
          </revogr-overlay-selection>
        );
      }
      viewPortHtml.push(
        <revogr-viewport-scroll
          {...view.prop}
          ref={el => this.scrollingService.registerElement(el, view.prop.key)}
          onScrollViewport={e => this.scrollingService.onScroll(e.detail, view.prop.key)}>
          <revogr-header
            viewportCol={view.viewportCol}
            {...view.headerProp}
            selectionStore={colSelectionStore.store}
            slot='header'
            columnFilter={this.columnFilter}
            canResize={this.resize}/>
          {dataViews}
        </revogr-viewport-scroll>
      );
    }
    return viewPortHtml;
  }

  render(): VNode {
    const contentHeight: number = this.dimensions['row'].get('realSize');
    const viewports: VNode[] = this.renderViewports(contentHeight);
    return <Host{...{[`${UUID}`]: this.uuid}}>
      <div class='main-viewport'>
        <div class='viewports'>
          {viewports}

          <revogr-scroll-virtual
            class='vertical'
            dimension='row'
            viewportStore={this.viewports['row']}
            dimensionStore={this.dimensions['row']}
            ref={el => this.scrollingService.registerElement(el, 'rowScroll')}
            onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
          <OrderRenderer ref={e => this.orderService = e}/>
        </div>
      </div>
      <revogr-scroll-virtual
        class='horizontal'
        dimension='col'
        viewportStore={this.viewports['col']}
        dimensionStore={this.dimensions['col']}
        ref={el => this.scrollingService.registerElement(el, 'colScroll')}
        onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
    </Host>;
  }
}
