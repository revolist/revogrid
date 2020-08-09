import {Component, Prop, h, Watch, Element, Listen, Host} from '@stencil/core';

import dimensionStore, {setSettings} from '../../store/dimension/dimension.store';
import viewportStore, {setViewport} from '../../store/viewPort/viewport.store';
import {
  ColumnData,
  DataType,
  Edition, ViewPortResizeEvent,
  ViewPortScrollEvent, VirtualPositionItem
} from '../../interfaces';
import moduleRegister from '../../services/moduleRegister';
import {UUID} from '../../utils/consts';
import dataProvider from '../../services/data.provider';
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import initialSettings from '../../utils/initialSettings';
import columnProvider from "../../services/column.data.provider";

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGrid {
  private elementToScroll: ElementScroll[] = [];
  private uuid: number|null = null;
  private scrollingService: GridScrollingService;

  @Element() element: HTMLElement;

  @Prop() frameSize: number = initialSettings.frameSize;
  @Prop() rowSize: number = initialSettings.defaultRowSize;
  @Prop() colSize: number = initialSettings.defaultColumnSize;
  @Prop() range: boolean = initialSettings.range;
  @Prop() readonly: boolean = initialSettings.readonly;
  @Prop() resize: boolean = initialSettings.resize;

  // data is array of objects
  @Prop() source: DataType[] = [];
  @Watch('source')
  dataChanged(newVal: DataType[]): void {
    dataProvider.setData(newVal);
  }

  // if source provided as object header 'prop' will link to the object field
  @Prop() columns: ColumnData = [];
  @Watch('columns')
  columnChanged(newVal: ColumnData) {
    columnProvider.setColumns(newVal);
  }

  @Listen('beforeEdit')
  beforeSave(e: CustomEvent<Edition.SaveDataDetails>): void {
    setTimeout(() => {
      if (!e.defaultPrevented) {
        dataProvider.setCellData(e.detail.row, e.detail.col, e.detail.val);
      }
    }, 0);
  }

  connectedCallback(): void {
    this.uuid = (new Date()).getTime();
    this.scrollingService = new GridScrollingService()
    moduleRegister.baseClass = `[${UUID}='${this.uuid}']`;
    moduleRegister.register('scrolling', this.scrollingService);

    setSettings({
      originItemSize: this.rowSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'row');
    setSettings({
      originItemSize: this.colSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'col');

    this.columnChanged(this.columns);
    this.dataChanged(this.source);
  }

  componentDidRender(): void {
    this.scrollingService.registerElements(this.elementToScroll);
  }

  disconnectedCallback(): void {
    moduleRegister.destroy();
  }

  render() {
    this.elementToScroll.length = 0;
    const rows: VirtualPositionItem[] = viewportStore.row.get('items');
    const cols: VirtualPositionItem[] = viewportStore.col.get('items');
    const contentHeight = dimensionStore.row.get('realSize');
    const hostProp = { [`${UUID}`]: this.uuid };

    const pinStartSize = dimensionStore.colPinStart.get('realSize');
    const viewportPinnedProp = {
      contentWidth: pinStartSize,
      style: {
        width: `${pinStartSize}px`
      },
      contentHeight,
      key: 'pinned-left',
      class: 'pinned-left',
      ref: (el: HTMLRevogrViewportElement) => this.elementToScroll.push(el),
      onScrollViewport: (e: CustomEvent<ViewPortScrollEvent>) => this.scrollingService.onScroll(e.detail)
    };

    const viewportDataProp = {
      class: 'data-view',
      contentWidth: dimensionStore.col.get('realSize'),
      contentHeight,
      ref: (el: HTMLRevogrViewportElement) => this.elementToScroll.push(el),
      onScrollViewport: (e: CustomEvent<ViewPortScrollEvent>) => this.scrollingService.onScroll(e.detail),
      onResizeViewport: (e: CustomEvent<ViewPortResizeEvent>) => setViewport({ virtualSize:  e.detail.size}, e.detail.dimension)
    };
    return <Host{...hostProp}>
      <revogr-scroll-virtual
          class='vertical-scroll'
          contentSize={contentHeight}
          ref={el => this.elementToScroll.push(el)}
          onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
      <div class='main-viewport'>
        <revogr-viewport {...viewportPinnedProp}>
          <revogr-header slot='header' class='header' pinned='pinStart' resize={this.resize}
                         cols={viewportStore.colPinStart.get('items')}/>
          <revogr-data slot='content' class='viewport-layer' pinned='pinStart' rows={rows}
                       cols={viewportStore.colPinStart.get('items')}/>
        </revogr-viewport>

        <revogr-viewport {...viewportDataProp} key='center'>
            <revogr-header slot='header' class='header' resize={this.resize} cols={cols}/>
            <revogr-data slot='content' class='viewport-layer' rows={rows} cols={cols}/>
            { !this.readonly || this.range ? <revogr-overlay-selection slot='content' range={this.range}/> : '' }
            { !this.readonly ? <revogr-edit slot='content'/> : '' }
        </revogr-viewport>
      </div>
    </Host>;
  }
}
