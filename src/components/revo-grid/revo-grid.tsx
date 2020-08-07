import {Component, Prop, h, Watch, Element, Listen} from '@stencil/core';


import {setSettings} from '../../store/dimension/dimension.store';
import {colsStore as viewportCols, rowsStore as viewportRows, setViewport} from '../../store/viewPort/viewport.store';
import {
  ColumnData,
  DataType, DimensionType,
  Edition,
  ViewPortScrollEvent, VirtualPositionItem
} from '../../interfaces';
import GridResizeService from './gridResizeService';
import moduleRegister from '../../services/moduleRegister';
import {UUID, VIEWPORT_CLASS} from '../../utils/consts';
import dataProvider from '../../services/data.provider';
import GridScrollingService from './gridScrollingService';
import initialSettings from "../../utils/initialSettings";

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGrid {
  private viewport: HTMLRevogrViewportElement;
  private verticalScroll: HTMLRevogrScrollVirtualElement;
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
    dataProvider.setColumns(newVal);
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
    this.scrollingService = new GridScrollingService({
      scrollVirtual: (e: ViewPortScrollEvent) => {
        switch (e.dimension) {
          case 'col':
            break;
          case 'row':
            this.verticalScroll?.setScroll(e);
            break;
        }
      },
      scroll: e => this.viewport?.setScroll(e)
    })
    moduleRegister.baseClass = `.${VIEWPORT_CLASS}[${UUID}='${this.uuid}']`;
    moduleRegister.register('scrolling', this.scrollingService);

    setViewport({ frameOffset: this.frameSize || 0 }, 'row');
    setViewport({ frameOffset: this.frameSize || 0 }, 'col');
    setSettings(this.rowSize, 'row');
    setSettings(this.colSize, 'col');

    this.columnChanged(this.columns);
    this.dataChanged(this.source);
  }

  disconnectedCallback(): void {
    moduleRegister.destroy();
  }

  async componentDidLoad(): Promise<void> {
    moduleRegister.register('resize', new GridResizeService(this.viewport, {
      scroll: async(dimension: DimensionType) => this.scrollingService.onScroll({
        dimension,
        coordinate: await this.viewport.getScroll(dimension)
      })
    }));
  }

  render() {
    const viewportProp = {
      class: `viewport ${VIEWPORT_CLASS} horizontal-wrapper`,
      [`${UUID}`]: this.uuid,
      onScrollViewport: (e: CustomEvent<ViewPortScrollEvent>) => this.scrollingService.onScroll(e.detail),
      ref: (el: HTMLRevogrViewportElement) => { this.viewport = el; }
    };
    const rows: VirtualPositionItem[] = viewportRows.get('items');
    const cols: VirtualPositionItem[] = viewportCols.get('items');

    return [
      <revogr-viewport{...viewportProp}>
          <revogr-header slot='header' class='header' resize={this.resize} cols={cols}/>
          <revogr-data slot='content' class='viewport-layer' rows={rows} cols={cols}/>
          { !this.readonly || this.range ? <revogr-overlay-selection slot='content' range={this.range}/> : '' }
          { !this.readonly ? <revogr-edit slot='content'/> : '' }
      </revogr-viewport>,

      <revogr-scroll-virtual ref={el => this.verticalScroll = el} onScrollVirtual={e => this.scrollingService.onScrollVirtual(e.detail)}/>
    ];
  }
}
