import {Component, Prop, h, Watch, Element, State} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

import initialSettings from '../../utils/initialSettings';
import ColumnDataProvider from '../../services/column.data.provider';
import {DataProvider} from '../../services/data.provider';
import {DataSourceState} from '../../store/dataSource/data.store';
import DimensionProvider from '../../services/dimension.provider';
import ViewportProvider from "../../services/viewport.provider";
import {RevoGrid} from "../../interfaces";


type ColumnStores = {[T in RevoGrid.DimensionCols]: ObservableMap<DataSourceState<RevoGrid.ColumnDataSchemaRegular>>};
type RowStores = {[T in RevoGrid.DimensionRows]: ObservableMap<DataSourceState<RevoGrid.DataType>>};
type DimensionStores = {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.DimensionSettingsState>};
type ViewportStores = {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.ViewportState>};

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGridComponent {
  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  /**
   * Defines how many rows/columns should be rendered outside visible area.
   */
  @Prop() frameSize: number = initialSettings.frameSize;
  /**
   * Indicates default row size.
   */
  @Prop() rowSize: number = initialSettings.defaultRowSize;
  /**
   * Indicates default column size.
   */
  @Prop() colSize: number = initialSettings.defaultColumnSize;
  /**
   * When true, user can range selection.
   */
  @Prop() range: boolean = initialSettings.range;
  /**
   * When true, grid in read only mode.
   */
  @Prop() readonly: boolean = initialSettings.readonly;
  /**
   * When true, columns are resizable.
   */
  @Prop() resize: boolean = initialSettings.resize;
  /**
   * Columns - defines an array of grid columns. Can be column or grouped column.
   */
  @Prop() columns: (RevoGrid.ColumnDataSchemaRegular|RevoGrid.ColumnDataSchemaGrouping)[] = [];
  /**
   * Source: {[T in ColumnProp]: any} - defines main data source.
   * Can be an Object or 2 dimensional array([][]);
   * ColumnProp - string|number. It is reference for column mapping.
   */
  @Prop() source: RevoGrid.DataType[] = [];
  /**
   * Pinned top Source: {[T in ColumnProp]: any} - defines pinned top rows data source.
   */
  @Prop() pinnedTopSource: RevoGrid.DataType[] = [];
  /**
   * Pinned bottom Source: {[T in ColumnProp]: any} - defines pinned bottom rows data source.
   */
  @Prop() pinnedBottomSource: RevoGrid.DataType[] = [];


  // --------------------------------------------------------------------------
  //
  //  Private Properties
  //
  // --------------------------------------------------------------------------

  @State() uuid: string|null = null;
  @State() columnProvider: ColumnDataProvider;
  @State() dataProvider: DataProvider;
  @State() dimensionProvider: DimensionProvider;
  @State() viewportProvider: ViewportProvider;

  @Element() element: HTMLElement;


  @Watch('columns')
  columnChanged(newVal: RevoGrid.ColumnData) {
    this.columnProvider.setColumns(newVal);
  }

  @Watch('source')
  dataChanged(newVal: RevoGrid.DataType[]): void {
    this.dataProvider.setData(newVal, 'row');
  }

  @Watch('pinnedBottomSource')
  dataBottomChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinEnd');
  }

  @Watch('pinnedTopSource')
  dataTopChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinStart');
  }

  get columnStores(): ColumnStores {
    return reduce(this.columnProvider.stores, (res: Partial<ColumnStores>, dataSource, k: RevoGrid.DimensionCols) => {
      res[k] = dataSource.store;
      return res;
    }, {}) as ColumnStores;
  }

  get rowStores(): RowStores {
    return reduce(this.dataProvider.stores, (res: Partial<RowStores>, dataSource, k: RevoGrid.DimensionRows) => {
      res[k] = dataSource.store;
      return res;
    }, {}) as RowStores;
  }

  get dimensionStores(): DimensionStores {
    return reduce(this.dimensionProvider.stores, (res: Partial<DimensionStores>, dataSource, k: RevoGrid.MultiDimensionType) => {
      res[k] = dataSource.store;
      return res;
    }, {}) as DimensionStores;
  }

  get viewportStores(): ViewportStores {
    return reduce(this.viewportProvider.stores, (res: Partial<ViewportStores>, dataSource, k: RevoGrid.MultiDimensionType) => {
      res[k] = dataSource.store;
      return res;
    }, {}) as ViewportStores;
  }

  connectedCallback(): void {
    this.viewportProvider = new ViewportProvider();
    this.dimensionProvider = new DimensionProvider(this.viewportProvider);
    this.columnProvider = new ColumnDataProvider(this.dimensionProvider);
    this.dataProvider = new DataProvider(this.dimensionProvider);
    this.uuid = (new Date()).getTime().toString();
    this.dimensionProvider.setSettings({
      originItemSize: this.rowSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'row');
    this.dimensionProvider.setSettings({
      originItemSize: this.colSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'col');

    this.columnChanged(this.columns);

    this.dataChanged(this.source);
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
  }

  render() {
    return <revogr-viewport
        onSetDimensionSize={e => this.dimensionProvider.setDimensionSize(e.detail.type, e.detail.sizes)}
        onSetViewportCoordinate={e => this.dimensionProvider.setViewPortCoordinate(e.detail)}
        onSetViewportSize={e => this.viewportProvider.setViewport(e.detail.dimension, { virtualSize:  e.detail.size})}
        columnStores={this.columnStores}
        dimensions={this.dimensionStores}
        viewports={this.viewportStores}
        rowStores={this.rowStores}
        dataProvider={this.dataProvider}
        uuid={this.uuid}
        resize={this.resize}
        readonly={this.readonly}
        range={this.range}/>;
  }
}
