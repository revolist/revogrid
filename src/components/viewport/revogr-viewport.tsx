import {Component, Prop, h, Host, Listen, Element, Event, EventEmitter, VNode} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import '../../utils/closestPolifill';

import {UUID} from '../../utils/consts';
import {gatherColumnData, ViewportColumn} from './viewport.helpers';
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import ViewportSpace from './viewport.interfaces';
import {DataSourceState} from '../../store/dataSource/data.store';
import SelectionStoreConnector from '../../services/selection.store.connector';
import {Edition, RevoGrid} from '../../interfaces';
import ViewportProps = ViewportSpace.ViewportProps;

@Component({
  tag: 'revogr-viewport'
})
export class RevogrViewport {
  private elementToScroll: ElementScroll[] = [];
  private scrollingService: GridScrollingService;
  private selectionStoreConnector: SelectionStoreConnector;

  @Event() setDimensionSize: EventEmitter<{type: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp}>;
  @Event() setViewportCoordinate: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  @Event() setViewportSize: EventEmitter<RevoGrid.ViewPortResizeEvent>;

  @Element() element: Element;
  @Prop() columnStores: {[T in RevoGrid.DimensionCols]: ObservableMap<DataSourceState<RevoGrid.ColumnDataSchemaRegular>>};
  @Prop() rowStores: {[T in RevoGrid.DimensionRows]: ObservableMap<DataSourceState<RevoGrid.DataType>>};
  @Prop() dimensions: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.DimensionSettingsState>};
  @Prop() viewports: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.ViewportState>};


  /** Custom editors register  */
  @Prop() editors: Edition.Editors;

  @Prop() uuid: string|null = null;
  @Prop() resize: boolean;
  @Prop() readonly: boolean;
  @Prop() range: boolean;

  /** Clear data which is outside of grid container */
  @Listen('click', { target: 'document' })
  handleOutsideClick(e: KeyboardEvent): void {
    const target: HTMLElement|null = e.target as HTMLElement;
    if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
      this.selectionStoreConnector.clearAll();
    }
  }

  connectedCallback(): void {
    this.selectionStoreConnector = new SelectionStoreConnector();
    this.scrollingService = new GridScrollingService(
      (e: RevoGrid.ViewPortScrollEvent) => this.setViewportCoordinate.emit(e));
  }

  componentDidRender(): void {
    this.scrollingService.registerElements(this.elementToScroll);
  }

  private renderViewports(contentHeight: number): VNode[] {
    this.elementToScroll.length = 0;
    const rows: RevoGrid.VirtualPositionItem[] = this.viewports['row'].get('items');
    const viewports: ViewportProps[] = [];
    const cols: RevoGrid.DimensionCols[] = ['colPinStart', 'col', 'colPinEnd'];
    let index: number = 0;
    cols.forEach((val) => {
      const colStore = this.columnStores[val];
      if (colStore.get('items').length) {
        const column: ViewportColumn = {
          colType: val,
          position: { x: index, y: 1 },


          contentHeight: contentHeight,
          fixWidth: val !== 'col',
          uuid: `${this.uuid}-${index}`,
          rows: rows,

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
      }
    });

    const viewPortHtml: VNode[] = [];

    /** render viewports columns */
    for (let view of viewports) {
      const dataViews: HTMLElement[] = [];
      let j: number = 0;

      /** render viewports rows */
      for (let data of view.dataPorts) {
        const selectionStore = this.selectionStoreConnector.register(data.position);
        dataViews.push(

          <revogr-overlay-selection
            {...data}
            slot={data.slot}
            selectionStore={selectionStore}
            editors={this.editors}
            readonly={this.readonly}
            range={this.range}

            onSetEdit={(e) => this.selectionStoreConnector.setEdit(e.detail)}
            onChangeSelection={(e) => this.selectionStoreConnector.change(e.detail)}
            onFocusCell={(e) => this.selectionStoreConnector.focus(selectionStore, e.detail)}
            onUnregister={() => this.selectionStoreConnector.unregister(selectionStore)}>

            <revogr-data
              {...data}
              {...{[UUID]: data.uuid}}
              key={view.prop.key + (++j)}
              readonly={this.readonly}
              range={this.range}
              slot='data'/>
          </revogr-overlay-selection>
        );
      }
      viewPortHtml.push(
        <revogr-viewport-scroll
          {...view.prop}
          ref={el => this.elementToScroll.push(el)}
          onScrollViewport={e => this.scrollingService.onScroll(e.detail, view.prop.key)}>
          <revogr-header {...view.headerProp} slot='header' canResize={this.resize}/>
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
            contentSize={contentHeight}
            ref={el => this.elementToScroll.push(el)}
            virtualSize={this.viewports['row'].get('virtualSize')}
            onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
        </div>
      </div>
      <revogr-scroll-virtual
        class='horizontal'
        dimension='col'
        contentSize={this.dimensions['col'].get('realSize')}
        ref={el => this.elementToScroll.push(el)}
        virtualSize={this.viewports['col'].get('virtualSize')}
        onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
    </Host>;
  }
}
