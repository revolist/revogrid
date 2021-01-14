import {Component, Prop, h, Watch, Element, Listen, Event, EventEmitter, Method, VNode, State} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

import ColumnDataProvider, { ColumnCollection } from '../../services/column.data.provider';
import {DataProvider} from '../../services/data.provider';
import {DataSourceState, getVisibleSourceItem} from '../../store/dataSource/data.store';
import DimensionProvider from '../../services/dimension.provider';
import ViewportProvider from '../../services/viewport.provider';
import {Edition, Selection, RevoGrid, ThemeSpace, RevoPlugin} from '../../interfaces';
import ThemeService from '../../themeManager/themeService';
import { timeout } from '../../utils/utils';
import { each } from 'lodash';
import AutoSize, { AutoSizeColumnConfig } from '../../plugins/autoSizeColumn';
import { columnTypes } from '../../store/storeTypes';
import FilterPlugin, { ColumnFilterConfig, FilterCollection } from '../../plugins/filter/filter.plugin';
import SortingPlugin from '../../plugins/sorting/sorting.plugin';
import ExportFilePlugin from '../../plugins/export/export.plugin';
import { DataInput } from '../../plugins/export/types';
import GroupingRowPlugin, { GroupingOptions } from '../../plugins/groupingRow/grouping.row.plugin';

type ColumnStores = {
  [T in RevoGrid.DimensionCols]: ObservableMap<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
};
type RowStores = {
  [T in RevoGrid.DimensionRows]: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;
};
type DimensionStores = {
  [T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.DimensionSettingsState>
};
type ViewportStores = {
  [T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.ViewportState>
};

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.common.scss',
  styleUrls: {
    'default': 'revo-grid.default.scss',
    'material': 'revo-grid.material.scss',
    'compact': 'revo-grid.compact.scss',
    'darkMaterial': 'revo-grid.dark.material.scss',
    'darkCompact': 'revo-grid.dark.compact.scss'
  },
})
export class RevoGridComponent {
  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  /** Excel like show row indexe per row */
  @Prop() rowHeaders: RevoGrid.RowHeaders|boolean;
  /**
   * Defines how many rows/columns should be rendered outside visible area.
   */
  @Prop() frameSize: number = 1;
  /**
   * Indicates default row size.
   * By default 0, means theme package size will be applied
   */
  @Prop() rowSize: number = 0;
  /** Indicates default column size. */
  @Prop() colSize: number = 100;
  /** When true, user can range selection. */
  @Prop() range: boolean = false;
  /** When true, grid in read only mode. */
  @Prop() readonly: boolean = false;
  /** When true, columns are resizable. */
  @Prop() resize: boolean = false;
  /** When true cell focus appear. */
  @Prop() canFocus: boolean = true;
  /**
   * Columns - defines an array of grid columns.
   * Can be column or grouped column.
   */
  @Prop() columns: (RevoGrid.ColumnRegular|RevoGrid.ColumnGrouping)[] = [];
  /**
   * Source - defines main data source.
   * Can be an Object or 2 dimensional array([][]);
   * Keys/indexes referenced from columns Prop
   */
  @Prop() source: RevoGrid.DataType[] = [];
  /** Pinned top Source: {[T in ColumnProp]: any} - defines pinned top rows data source. */
  @Prop() pinnedTopSource: RevoGrid.DataType[] = [];
  /** Pinned bottom Source: {[T in ColumnProp]: any} - defines pinned bottom rows data source. */
  @Prop() pinnedBottomSource: RevoGrid.DataType[] = [];
  /** Row properies applied */
  @Prop() rowDefinitions: RevoGrid.RowDefinition[] = [];

  /** Custom editors register */
  @Prop() editors: Edition.Editors = {};

  /**
   * Custom grid plugins
   * Has to be predefined during first grid init
   * Every plugin should be inherited from BasePlugin
   */
  @Prop() plugins: RevoPlugin.PluginClass[];

  /** Types
   *  Every type represent multiple column properties
   *  Types will be merged but can be replaced with column properties
   */
  @Prop() columnTypes: {[name: string]: RevoGrid.ColumnType} = {};


  /** Theme name */
  @Prop({ reflect: true, mutable: true }) theme: ThemeSpace.Theme = 'default';


  /** 
   * Row class property
   * Define this property in row object and this will be mapped as row class
   */
  @Prop({ reflect: true }) rowClass: string = '';


  /** 
   * Autosize config
   * Enable columns autoSize, for more details check @autoSizeColumn plugin
   * By default disabled, hence operation is not resource efficient
   * true to enable with default params (double header separator click for autosize)
   * or provide config
   */
  @Prop() autoSizeColumn: boolean|AutoSizeColumnConfig = false;

  /** 
   * Enables filter plugin
   * Can be boolean
   * Can be filter collection
   */
  @Prop() filter: boolean|ColumnFilterConfig = false;


  /** 
   * Trimmed rows
   * Functionality which allows to hide rows from main data set
   * @trimmedRows are physical row indexes to hide
   */
  @Prop() trimmedRows: Record<number, boolean> = {};

  /** 
   * Enables export plugin
   * Can be boolean
   * Can be export options
   */
  @Prop() export: boolean = false;

  /** 
   * Group models by provided properties
   * Define properties to be groped by
   */
  @Prop() grouping: GroupingOptions;

  
  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  /** 
   * Before edit event.
   * Triggered before edit data applied.
   * Use e.preventDefault() to prevent edit data set and use you own. 
   * Use e.val = {your value} to replace edit result with your own. 
   */
  @Event() beforeEdit: EventEmitter<Edition.BeforeSaveDataDetails>;

  /** 
   * Before range edit event.
   * Triggered before range data applied, when range selection happened.
   * Use e.preventDefault() to prevent edit data set and use you own. 
   */
  @Event() beforeRangeEdit: EventEmitter<Edition.BeforeRangeSaveDataDetails>;

  /** 
   * After edit.
   * Triggered when after data applied or Range changeged.
   */
  @Event() afterEdit: EventEmitter<Edition.BeforeSaveDataDetails|Edition.BeforeRangeSaveDataDetails>;


  /** 
   * Before autofill.
   * Triggered before autofill applied.
   * Use e.preventDefault() to prevent edit data apply. 
   */
  @Event() beforeAutofill: EventEmitter<Selection.ChangedRange>;


  /** 
   * Before range apply.
   * Triggered before range applied.
   * Use e.preventDefault() to prevent range. 
   */
  @Event() beforeRange: EventEmitter<Selection.ChangedRange>;

   /** 
   * Before row order apply.
   * Use e.preventDefault() to prevent row order change. 
   */
  @Event() rowOrderChanged: EventEmitter<{from: number; to: number;}>;

  /** 
  * Before source update sorting apply.
  * Use this event if you intended to prevent sorting on data update.
  * Use e.preventDefault() to prevent sorting data change during rows source update. 
  */
  @Event() beforeSourceSortingApply: EventEmitter;


  /** 
  * Before sorting apply.
  * Use e.preventDefault() to prevent sorting data change. 
  */
 @Event() beforeSortingApply: EventEmitter<{
  column: RevoGrid.ColumnRegular,
  order: 'desc'|'asc'
}>;
 /** 
 * Before sorting event.
 * Initial sorting triggered, if this event stops no other event called.
 * Use e.preventDefault() to prevent sorting. 
 */
  @Event() beforeSorting: EventEmitter<{
    column: RevoGrid.ColumnRegular,
    order: 'desc'|'asc'
  }>;

  /** 
   * Row order change started.
   * Use e.preventDefault() to prevent row order change. 
   * Use e.text = 'new name' to change item name on start.
   */
  @Event() rowDragStart: EventEmitter<{pos: RevoGrid.PositionItem, text: string}>;

  /** 
   * On header click.
   */
  @Event() headerClick: EventEmitter<RevoGrid.ColumnRegular>;

  /** 
   * Before cell focus changed.
   * Use e.preventDefault() to prevent cell focus change. 
   */
  @Event() beforeCellFocus: EventEmitter<Edition.BeforeSaveDataDetails>;
  /** 
   * Before data apply.
   * You can override data source here 
   */
  @Event() beforeSourceSet: EventEmitter<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

  /**  After rows updated */
  @Event() afterSourceSet: EventEmitter<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

  /**  Before column update */
  @Event() beforeColumnsSet: EventEmitter<ColumnCollection>;

  /**  Column updated */
  @Event() afterColumnsSet: EventEmitter<{
    columns: ColumnCollection;
    order: Record<RevoGrid.ColumnProp, 'asc'|'desc'>;
  }>;

  /**  
   * Before filter applied to data source
   * Use e.preventDefault() to prevent cell focus change
   * Update @collection if you wish to change filters on the flight
   */
  @Event() beforeFilterApply: EventEmitter<{ collection: FilterCollection; }>;

  /**  
   * Triggered when view port scrolled
   */
  @Event() viewportScroll: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  /**  
   * Before export
   * Use e.preventDefault() to prevent export
   * Replace data in Event in case you want to modify it in export
   */
  @Event() beforeExport: EventEmitter<DataInput>;

  /**  
   * Before edit started
   * Use e.preventDefault() to prevent edit
   */
  @Event() beforeEditStart: EventEmitter<Edition.BeforeSaveDataDetails>;

  // --------------------------------------------------------------------------
  //
  //  Methods
  //
  // --------------------------------------------------------------------------
  /** 
   * Refreshes data viewport.
   * Can be specific part as row or pinned row or 'all' by default. 
   */
  @Method() async refresh(type: RevoGrid.DimensionRows|'all' = 'all') {
    this.dataProvider.refresh(type);
  }

  /**  Scrolls view port to specified row index */
  @Method() async scrollToRow(coordinate: number = 0) {
    const y = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'row'
    });
    await this.scrollToCoordinate({ y });
  }


  /** Scrolls view port to specified column index */
  @Method() async scrollToColumnIndex(coordinate: number = 0) {
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'col'
    });
    await this.scrollToCoordinate({ x });
  }

  /**  Scrolls view port to specified column prop */
  @Method() async scrollToColumnProp(prop: RevoGrid.ColumnProp) {
    const coordinate = this.columnProvider.getColumnIndexByProp(prop, 'col');
    if (coordinate < 0) {
      // already on the screen
      return;
    }
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'col'
    });
    await this.scrollToCoordinate({ x });
  }

  /** Update columns */
  @Method() async updateColumns(cols: RevoGrid.ColumnRegular[]) {
    this.columnProvider.updateColumns(cols);
  }

  /** Add trimmed by type */
  @Method() async addTrimmed(newVal: Record<number, boolean>, trimmedType = 'external', type: RevoGrid.DimensionRows = 'row') {
    this.dataProvider.setTrimmed({ [trimmedType]: newVal }, type);
  }

  /**  Scrolls view port to coordinate */
  @Method() async scrollToCoordinate(cell: Partial<Selection.Cell>) {
    await this.viewportElement.scrollToCoordinate(cell);
  }

  /**  Bring cell to edit mode */
  @Method() async setCellEdit(row: number, prop: RevoGrid.ColumnProp, rowSource: RevoGrid.DimensionRows = 'row') {
    const col = ColumnDataProvider.getColumnByProp(this.columns, prop);
    if (!col) {
      return;
    }
    await timeout();
    this.viewportElement.setEdit(
      row,
      this.columnProvider.getColumnIndexByProp(prop, 'col'),
      col.pin || 'col',
      rowSource
    );
  }

  /** 
   * Register new virtual node inside of grid
   * Used for additional items creation such as plugin elements
  */
  @Method() async registerVNode(elements: VNode[]) {
    this.extraElements.push(...elements);
    this.extraElements = [...this.extraElements];
  }

  /**  Get data from source */
  @Method() async getSource(type: RevoGrid.DimensionRows = 'row') {
    return this.rowStores[type].get('source');
  }

  /**  
   * Get data from visible part of source
   * Trimmed/filtered rows will be excluded
   * @param type - type of source
   */
  @Method() async getVisibleSource(type: RevoGrid.DimensionRows = 'row') {
    return getVisibleSourceItem(this.rowStores[type]);
  }

  /**
   * Provides access to rows internal store observer
   * Can be used for plugin support
   * @param type - type of source
   */
  @Method() async getSourceStore(type: RevoGrid.DimensionRows = 'row') {
    return this.rowStores[type];
  }
  /**
   * Provides access to column internal store observer
   * Can be used for plugin support
   * @param type - type of column
   */
  @Method() async getColumnStore(type: RevoGrid.DimensionCols = 'col') {
    return this.columnStores[type];
  }

  /**
   * Update column sorting
   * @param column - full column details to update
   * @param index - virtual column index
   * @param order - order to apply
   */
  @Method() async updateColumnSorting(column: RevoGrid.ColumnRegular, index: number, order: 'asc'|'desc') {
    return this.columnProvider.updateColumnSorting(column, index, order);
  }

  /**
   * Receive all columns in data source
   */
  @Method() async getColumns(): Promise<RevoGrid.ColumnRegular[]> {
    return reduce(this.columnStores, (res, store) => {
      res.push(...store.get('source'));
      return res;
    }, []);
  }

  /**
   * Clear current grid focus
   */
  @Method() async clearFocus() {
    return this.viewportElement.clearFocus();
  }

  /**
   * Get all active plugins instances
   */
  @Method() async getPlugins(): Promise<RevoPlugin.Plugin[]> {
    return [...this.internalPlugins];
  }
  
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------
  @Listen('internalCellEdit')
  async onBeforeEdit(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented, detail } = this.beforeEdit.emit(e.detail);
    await timeout();
    // apply data
    if (!defaultPrevented) {
      this.dataProvider.setCellData(detail);
      this.afterEdit.emit(detail);
    }
  }

  @Listen('internalRangeDataApply')
  onBeforeRangeEdit(e: CustomEvent<Edition.BeforeRangeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.beforeRangeEdit.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.afterEdit.emit(e.detail);
  }

  @Listen('internalSelectionChanged')
  onRangeChanged(e: CustomEvent<Selection.ChangedRange>) {
    e.cancelBubble = true;
    const beforeRange = this.beforeRange.emit(e.detail);
    if (beforeRange.defaultPrevented) {
      e.preventDefault();
    }
    const beforeFill = this.beforeAutofill.emit(e.detail);
    if (beforeFill.defaultPrevented) {
      return;
    }
  }

  @Listen('initialRowDragStart')
  onDragStart(e: CustomEvent<{pos: RevoGrid.PositionItem, text: string}>) {
    e.cancelBubble = true;
    const dragStart = this.rowDragStart.emit(e.detail);
    if (dragStart.defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialRowDropped')
  onRowDropped(e: CustomEvent<{from: number; to: number;}>) {
    e.cancelBubble = true;
    const {defaultPrevented} = this.rowOrderChanged.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialHeaderClick')
  onHeaderClick(e: CustomEvent<RevoGrid.InitialHeaderClick>) {
    const {defaultPrevented} = this.headerClick.emit({
      ...e.detail.column,
      originalEvent:  e.detail.originalEvent
    });
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('internalFocusCell')
  onCellFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    e.cancelBubble = true;
    const {defaultPrevented} = this.beforeCellFocus.emit(e.detail);
    if (!this.canFocus || defaultPrevented) {
      e.preventDefault();
    }
  }
  
  // --------------------------------------------------------------------------
  //
  //  Private Properties
  //
  // --------------------------------------------------------------------------

  @State() extraElements: VNode[] = [];

  private uuid: string|null = null;
  private columnProvider: ColumnDataProvider;
  private dataProvider: DataProvider;
  private dimensionProvider: DimensionProvider;
  private viewportProvider: ViewportProvider;
  private themeService: ThemeService;

  /** 
   * Plugins
   * Define plugins collection
   */
  private internalPlugins: RevoPlugin.Plugin[] = [];

  @Element() element: HTMLRevoGridElement;
  private viewportElement: HTMLRevogrViewportElement;


  @Watch('columns')
  columnChanged(newVal: RevoGrid.ColumnData) {
    const columnGather = ColumnDataProvider.getColumns(newVal, 0, this.columnTypes);
    this.beforeColumnsSet.emit(columnGather);
    for (let type of columnTypes) {
      const items = columnGather.columns[type];
      this.dimensionProvider.setRealSize(items.length, type);
      this.dimensionProvider.setColumns(type, ColumnDataProvider.getSizes(items), type !== 'col');
    }
    const columns = this.columnProvider.setColumns(columnGather);
    this.afterColumnsSet.emit({
      columns,
      order: this.columnProvider.order
    });
  }

  @Watch('theme')
  themeChanged(t: ThemeSpace.Theme) {
    this.themeService.register(t);
    this.dimensionProvider.setSettings({ originItemSize: this.themeService.rowSize, frameOffset: this.frameSize || 0 }, 'row');
    this.dimensionProvider.setSettings({ originItemSize: this.colSize, frameOffset: this.frameSize || 0 }, 'col');
  }

  @Watch('source')
  dataChanged(source: RevoGrid.DataType[]) {
    let newSource = [...source];
    const beforeSourceSet = this.beforeSourceSet.emit({
      type: 'row',
      source: newSource
    });
    newSource = beforeSourceSet.detail.source;

    newSource = this.dataProvider.setData(newSource, 'row');
    this.afterSourceSet.emit({
      type: 'row',
      source: newSource
    });
  }

  @Watch('pinnedBottomSource')
  dataBottomChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinEnd');
  }

  @Watch('pinnedTopSource')
  dataTopChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinStart');
  }

  @Watch('rowDefinitions')
  rowDefChanged(newVal: RevoGrid.RowDefinition[]) {
    if (!newVal.length) {
      return;
    }
    const rows = reduce(newVal, (r: Partial<{[T in RevoGrid.DimensionRows]: {
      sizes?: Record<number, number>
    }}>, v) => {
      if (!r[v.type]) {
        r[v.type] = {};
      }
      if (v.size) {
        if (!r[v.type].sizes) {
          r[v.type].sizes = {};
        }
        r[v.type].sizes[v.index] = v.size;
      }
      return r;
    }, {});
    each(rows, (r, k: RevoGrid.DimensionRows) => {
      if (r.sizes) {
        this.dimensionProvider.setDimensionSize(k, r.sizes);
      }
    });
  }

  @Watch('trimmedRows') trimmedRowsChanged(newVal: Record<number, boolean>) {
    this.dataProvider.setTrimmed({ 'external': newVal }, 'row');
  }

  @Watch('grouping') groupingChanged(newVal: GroupingOptions = {}) {
    let grPlugin: GroupingRowPlugin|undefined;
    for (let p of this.internalPlugins) {
      const isGrouping = p as unknown as GroupingRowPlugin;
      if (isGrouping.setGrouping) {
        grPlugin = isGrouping;
        break;
      }
    }
    if (!grPlugin) {
      return;
    }
    grPlugin.setGrouping(newVal || {});
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

  connectedCallback() {
    this.viewportProvider = new ViewportProvider();
    this.themeService = new ThemeService({
      rowSize: this.rowSize
    });
    this.dimensionProvider = new DimensionProvider(this.viewportProvider);
    this.columnProvider = new ColumnDataProvider();
    this.dataProvider = new DataProvider(this.dimensionProvider);
    this.uuid = `${(new Date()).getTime()}-rvgrid`;


    if (this.autoSizeColumn) {
      this.internalPlugins.push(
        new AutoSize(
          this.element,
          {
            dataProvider: this.dataProvider,
            columnProvider: this.columnProvider,
            dimensionProvider: this.dimensionProvider
          },
          typeof this.autoSizeColumn === 'object' ? this.autoSizeColumn : undefined
        )
      );
    }
    this.trimmedRowsChanged(this.trimmedRows);
    if (this.filter) {
      this.internalPlugins.push(
        new FilterPlugin(
          this.element,
          this.uuid,
          typeof this.filter === 'object' ? this.filter : undefined
        )
      );
    }
    if (this.export) {
      this.internalPlugins.push(
        new ExportFilePlugin(this.element)
      );
    }
    this.internalPlugins.push(new SortingPlugin(this.element));
    if (this.plugins) {
      this.plugins.forEach(p => {
        this.internalPlugins.push(new p(this.element));
      });
    }

    this.internalPlugins.push(new GroupingRowPlugin(this.element, {
      dataProvider: this.dataProvider
    }));
    this.groupingChanged(this.grouping);
    this.themeChanged(this.theme);
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
    this.rowDefChanged(this.rowDefinitions);
  }

  disconnectedCallback() {
    each(this.internalPlugins, p => p.destroy());
    this.internalPlugins = [];
  }

  render() {
    return [<revogr-viewport
      ref={e => this.viewportElement = e}
      onSetDimensionSize={e => this.dimensionProvider.setDimensionSize(e.detail.type, e.detail.sizes)}
      onSetViewportCoordinate={e => {
        this.dimensionProvider.setViewPortCoordinate({
          coordinate: e.detail.coordinate,
          type: e.detail.dimension
        });
        this.viewportScroll.emit(e.detail);
      }}
      onSetViewportSize={e => this.viewportProvider.setViewport(e.detail.dimension, { virtualSize:  e.detail.size})}
      columnStores={this.columnStores}
      dimensions={this.dimensionStores}
      viewports={this.viewportStores}
      rowStores={this.rowStores}
      uuid={this.uuid}
      resize={this.resize}
      readonly={this.readonly}
      range={this.range}
      rowClass={this.rowClass}
      rowHeaders={this.rowHeaders}
      columnFilter={!!this.filter}
      editors={this.editors}/>, this.extraElements]
  }
}
