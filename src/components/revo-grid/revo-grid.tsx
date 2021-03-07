import { Component, Prop, h, Watch, Element, Listen, Event, EventEmitter, Method, VNode, State, Host } from '@stencil/core';
import reduce from 'lodash/reduce';
import each from 'lodash/each';

import ColumnDataProvider, { ColumnCollection } from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import { getVisibleSourceItem } from '../../store/dataSource/data.store';
import DimensionProvider from '../../services/dimension.provider';
import ViewportProvider from '../../services/viewport.provider';
import { Edition, Selection, RevoGrid, ThemeSpace, RevoPlugin } from '../../interfaces';
import ThemeService from '../../themeManager/themeService';
import { applyMixins, timeout } from '../../utils/utils';
import AutoSize, { AutoSizeColumnConfig } from '../../plugins/autoSizeColumn';
import { columnTypes } from '../../store/storeTypes';
import FilterPlugin, { ColumnFilterConfig, FilterCollection } from '../../plugins/filter/filter.plugin';
import SortingPlugin from '../../plugins/sorting/sorting.plugin';
import ExportFilePlugin from '../../plugins/export/export.plugin';
import { DataInput } from '../../plugins/export/types';
import GroupingRowPlugin from '../../plugins/groupingRow/grouping.row.plugin';
import { GroupingOptions } from '../../plugins/groupingRow/grouping.row.types';
import { ColumnSource, RowSource } from '../data/columnService';
import { RevoViewPort } from './viewport';
import GridRenderService from './viewport.service';
import { ViewPortSections } from './viewport.section';
import RevogrRowHeaders from '../rowHeaders/revogr-row-headers';
import GridScrollingService from './viewport.scrolling.service';
import { UUID } from '../../utils/consts';

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

  /** Excel like show row indexe per row */
  @Prop() rowHeaders: RevoGrid.RowHeaders | boolean;
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
  /** When true enable clipboard. */
  @Prop() useClipboard: boolean = true;
  /**
   * Columns - defines an array of grid columns.
   * Can be column or grouped column.
   */
  @Prop() columns: (RevoGrid.ColumnRegular | RevoGrid.ColumnGrouping)[] = [];
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
  @Prop() columnTypes: { [name: string]: RevoGrid.ColumnType } = {};

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
  @Prop() autoSizeColumn: boolean | AutoSizeColumnConfig = false;

  /**
   * Enables filter plugin
   * Can be boolean
   * Can be filter collection
   */
  @Prop() filter: boolean | ColumnFilterConfig = false;

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
  @Prop() exporting: boolean = false;

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
  @Event() afterEdit: EventEmitter<Edition.BeforeSaveDataDetails | Edition.BeforeRangeSaveDataDetails>;

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
  @Event() rowOrderChanged: EventEmitter<{ from: number; to: number }>;

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
    column: RevoGrid.ColumnRegular;
    order: 'desc' | 'asc';
  }>;
  /**
   * Before sorting event.
   * Initial sorting triggered, if this event stops no other event called.
   * Use e.preventDefault() to prevent sorting.
   */
  @Event() beforeSorting: EventEmitter<{
    column: RevoGrid.ColumnRegular;
    order: 'desc' | 'asc';
  }>;

  /**
   * Row order change started.
   * Use e.preventDefault() to prevent row order change.
   * Use e.text = 'new name' to change item name on start.
   */
  @Event() rowDragStart: EventEmitter<{ pos: RevoGrid.PositionItem; text: string }>;

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
    order: Record<RevoGrid.ColumnProp, 'asc' | 'desc'>;
  }>;

  /**
   * Before filter applied to data source
   * Use e.preventDefault() to prevent cell focus change
   * Update @collection if you wish to change filters
   */
  @Event() beforeFilterApply: EventEmitter<{ collection: FilterCollection }>;

  /**
   * Before filter trimmed values
   * Use e.preventDefault() to prevent value trimming and filter apply
   * Update @collection if you wish to change filters
   * Update @itemsToFilter if you wish to filter indexes of trimming
   */
  @Event() beforeFilterTrimmed: EventEmitter<{ collection: FilterCollection; itemsToFilter: Record<number, boolean> }>;

  /**
   * Before trimmed values
   * Use e.preventDefault() to prevent value trimming
   * Update @trimmed if you wish to filter indexes of trimming
   */
  @Event() beforeTrimmed: EventEmitter<{ trimmed: Record<number, boolean>; trimmedType: string; type: string }>;

  /**
   * Notify trimmed applied
   */
  @Event() afterTrimmed: EventEmitter;

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
  @Method() async refresh(type: RevoGrid.DimensionRows | 'all' = 'all') {
    this.dataProvider.refresh(type);
  }

  /**  Scrolls view port to specified row index */
  @Method() async scrollToRow(coordinate: number = 0) {
    const y = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'row',
    });
    await this.scrollToCoordinate({ y });
  }

  /** Scrolls view port to specified column index */
  @Method() async scrollToColumnIndex(coordinate: number = 0) {
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'col',
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
      dimension: 'col',
    });
    await this.scrollToCoordinate({ x });
  }

  /** Update columns */
  @Method() async updateColumns(cols: RevoGrid.ColumnRegular[]) {
    this.columnProvider.updateColumns(cols);
  }

  /** Add trimmed by type */
  @Method() async addTrimmed(trimmed: Record<number, boolean>, trimmedType = 'external', type: RevoGrid.DimensionRows = 'row') {
    const event = this.beforeTrimmed.emit({
      trimmed,
      trimmedType,
      type,
    });
    if (event.defaultPrevented) {
      return event;
    }
    this.dataProvider.setTrimmed({ [trimmedType]: event.detail.trimmed }, type);
    this.afterTrimmed.emit();
    return event;
  }

  /**  Scrolls view port to coordinate */
  @Method() async scrollToCoordinate(cell: Partial<Selection.Cell>) {
    this.scrollToCell(cell);
  }

  /**  Bring cell to edit mode */
  @Method() async setCellEdit(row: number, prop: RevoGrid.ColumnProp, rowSource: RevoGrid.DimensionRows = 'row') {
    const col = ColumnDataProvider.getColumnByProp(this.columns, prop);
    if (!col) {
      return;
    }
    await timeout();
    this.setEdit(row, this.columnProvider.getColumnIndexByProp(prop, 'col'), col.pin || 'col', rowSource);
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
    return this.dataProvider.stores[type].store.get('source');
  }

  /**
   * Get data from visible part of source
   * Trimmed/filtered rows will be excluded
   * @param type - type of source
   */
  @Method() async getVisibleSource(type: RevoGrid.DimensionRows = 'row') {
    return getVisibleSourceItem(this.dataProvider.stores[type].store);
  }

  /**
   * Provides access to rows internal store observer
   * Can be used for plugin support
   * @param type - type of source
   */
  @Method() async getSourceStore(type: RevoGrid.DimensionRows = 'row'): Promise<RowSource> {
    return this.dataProvider.stores[type].store;
  }
  /**
   * Provides access to column internal store observer
   * Can be used for plugin support
   * @param type - type of column
   */
  @Method() async getColumnStore(type: RevoGrid.DimensionCols = 'col'): Promise<ColumnSource> {
    return this.columnProvider.stores[type].store;
  }

  /**
   * Update column sorting
   * @param column - full column details to update
   * @param index - virtual column index
   * @param order - order to apply
   */
  @Method() async updateColumnSorting(column: RevoGrid.ColumnRegular, index: number, order: 'asc' | 'desc') {
    return this.columnProvider.updateColumnSorting(column, index, order);
  }

  /**
   * Receive all columns in data source
   */
  @Method() async getColumns(): Promise<RevoGrid.ColumnRegular[]> {
    return this.columnProvider.getColumns();
  }

  /**
   * Clear current grid focus
   */
  @Method() async clearFocus() {
    return this.clearFocused();
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

  /** Clear data which is outside of grid container */
  @Listen('click', { target: 'document' })
  handleOutsideClick({ target }: { target: HTMLElement | null }) {
    if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
      this.selectionStoreConnector.clearAll();
    }
  }

  /** DRAG AND DROP */
  @Listen('internalRowDragStart')
  onRowDragStarted(e: CustomEvent<{ pos: RevoGrid.PositionItem; text: string; event: MouseEvent }>) {
    e.cancelBubble = true;
    const dragStart = this.rowDragStart.emit(e.detail);
    if (dragStart.defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.orderService?.start(this.element, { ...e.detail, ...dragStart.detail });
  }

  @Listen('internalRowDragEnd')
  onRowDragEnd() {
    this.orderService?.end();
  }

  @Listen('internalRowDrag')
  onRowDrag({ detail }: CustomEvent<RevoGrid.PositionItem>) {
    this.orderService?.move(detail);
  }

  @Listen('internalRowMouseMove')
  onRowMouseMove(e: CustomEvent<Selection.Cell>): void {
    e.cancelBubble = true;
    this.orderService?.moveTip(e.detail);
  }

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

  @Listen('initialRowDropped')
  onRowDropped(e: CustomEvent<{ from: number; to: number }>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.rowOrderChanged.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialHeaderClick')
  onHeaderClick(e: CustomEvent<RevoGrid.InitialHeaderClick>) {
    const { defaultPrevented } = this.headerClick.emit({
      ...e.detail.column,
      originalEvent: e.detail.originalEvent,
    });
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('internalFocusCell')
  onCellFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.beforeCellFocus.emit(e.detail);
    if (!this.canFocus || defaultPrevented) {
      e.preventDefault();
    }
  }

  // --------------------------------------------------------------------------
  //
  //  Private Properties
  //
  // --------------------------------------------------------------------------

  // for internal plugin usage
  @State() extraElements: VNode[] = [];

  protected uuid: string | null = null;
  columnProvider: ColumnDataProvider;
  dataProvider: DataProvider;
  dimensionProvider: DimensionProvider;
  viewportProvider: ViewportProvider;
  private themeService: ThemeService;

  /**
   * Plugins
   * Define plugins collection
   */
  private internalPlugins: RevoPlugin.Plugin[] = [];

  @Element() element: HTMLRevoGridElement;

  @Watch('columns') columnChanged(newVal: RevoGrid.ColumnData) {
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
      order: this.columnProvider.order,
    });
  }

  @Watch('theme') themeChanged(t: ThemeSpace.Theme) {
    this.themeService.register(t);
    this.dimensionProvider.setSettings({ originItemSize: this.themeService.rowSize, frameOffset: this.frameSize || 0 }, 'row');
    this.dimensionProvider.setSettings({ originItemSize: this.colSize, frameOffset: this.frameSize || 0 }, 'col');
  }

  @Watch('source') dataChanged(source: RevoGrid.DataType[]) {
    let newSource = [...source];
    const beforeSourceSet = this.beforeSourceSet.emit({
      type: 'row',
      source: newSource,
    });
    newSource = beforeSourceSet.detail.source;

    newSource = this.dataProvider.setData(newSource, 'row');
    this.afterSourceSet.emit({
      type: 'row',
      source: newSource,
    });
  }

  @Watch('pinnedBottomSource') dataBottomChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinEnd');
  }

  @Watch('pinnedTopSource') dataTopChanged(newVal: RevoGrid.DataType[]) {
    this.dataProvider.setData(newVal, 'rowPinStart');
  }

  @Watch('rowDefinitions') rowDefChanged(newVal: RevoGrid.RowDefinition[]) {
    if (!newVal.length) {
      return;
    }
    const rows = reduce(
      newVal,
      (
        r: Partial<
          {
            [T in RevoGrid.DimensionRows]: {
              sizes?: Record<number, number>;
            };
          }
        >,
        v,
      ) => {
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
      },
      {},
    );
    each(rows, (r, k: RevoGrid.DimensionRows) => {
      if (r.sizes) {
        this.dimensionProvider.setDimensionSize(k, r.sizes);
      }
    });
  }

  @Watch('trimmedRows') trimmedRowsChanged(newVal: Record<number, boolean>) {
    this.addTrimmed(newVal);
  }

  @Watch('grouping') groupingChanged(newVal: GroupingOptions = {}) {
    let grPlugin: GroupingRowPlugin | undefined;
    for (let p of this.internalPlugins) {
      const isGrouping = (p as unknown) as GroupingRowPlugin;
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

  connectedCallback() {
    this.viewportProvider = new ViewportProvider();
    this.themeService = new ThemeService({
      rowSize: this.rowSize,
    });
    this.dimensionProvider = new DimensionProvider(this.viewportProvider);
    this.columnProvider = new ColumnDataProvider();
    this.dataProvider = new DataProvider(this.dimensionProvider);
    this.uuid = `${new Date().getTime()}-rvgrid`;

    if (this.autoSizeColumn) {
      this.internalPlugins.push(
        new AutoSize(
          this.element,
          {
            dataProvider: this.dataProvider,
            columnProvider: this.columnProvider,
            dimensionProvider: this.dimensionProvider,
          },
          typeof this.autoSizeColumn === 'object' ? this.autoSizeColumn : undefined,
        ),
      );
    }
    if (this.filter) {
      this.internalPlugins.push(new FilterPlugin(this.element, this.uuid, typeof this.filter === 'object' ? this.filter : undefined));
    }
    if (this.exporting) {
      this.internalPlugins.push(new ExportFilePlugin(this.element));
    }
    this.internalPlugins.push(new SortingPlugin(this.element));
    if (this.plugins) {
      this.plugins.forEach(p => {
        this.internalPlugins.push(new p(this.element));
      });
    }

    this.internalPlugins.push(
      new GroupingRowPlugin(this.element, {
        dataProvider: this.dataProvider,
        columnProvider: this.columnProvider,
      }),
    );
    this.themeChanged(this.theme);
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
    this.trimmedRowsChanged(this.trimmedRows);
    this.rowDefChanged(this.rowDefinitions);
    this.groupingChanged(this.grouping);
    this.viewportConnectedCallback();

    this.scrollingService = new GridScrollingService((e: RevoGrid.ViewPortScrollEvent) => {
      this.dimensionProvider.setViewPortCoordinate({
        coordinate: e.coordinate,
        type: e.dimension,
      });
      this.viewportScroll.emit(e);
    });
  }

  disconnectedCallback() {
    // destroy plugins on element disconnect
    each(this.internalPlugins, p => p.destroy());
    this.internalPlugins = [];
  }

  render() {
    this.selectionStoreConnector?.beforeUpdate();
    const contentHeight = this.dimensionProvider.stores['row'].store.get('realSize');
    const columns = this.getViewportColumnData(contentHeight);
    this.scrollingService?.unregister();

    return (
      <Host {...{ [`${UUID}`]: this.uuid }}>
        <RevoViewPort
          viewports={this.viewportProvider.stores}
          dimensions={this.dimensionProvider.stores}
          orderRef={e => (this.orderService = e)}
          registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
          onScroll={details => this.scrollingService.onScroll(details)}
        >
          {this.rowHeaders ? (
            <RevogrRowHeaders
              height={contentHeight}
              anyView={columns[0]}
              resize={this.resize}
              rowHeaderColumn={typeof this.rowHeaders === 'object' ? this.rowHeaders : undefined}
              beforeRowAdd={y => this.selectionStoreConnector.registerRow(y)}
              onScrollViewport={e => this.scrollingService.onScroll(e, 'headerRow')}
              onElementToScroll={e => this.scrollingService.registerElement(e, 'headerRow')}
            />
          ) : (
            ''
          )}
          <ViewPortSections
            columnFilter={!!this.filter}
            resize={this.resize}
            readonly={this.readonly}
            range={this.range}
            rowClass={this.rowClass}
            editors={this.editors}
            useClipboard={this.useClipboard}
            columns={columns}
            onEdit={detail => {
              const event = this.beforeEditStart.emit(detail);
              if (!event.defaultPrevented) {
                this.selectionStoreConnector.setEdit(detail.isCancel ? false : detail.val);
              }
            }}
            registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
            onScroll={details => this.scrollingService.onScroll(details)}
          />
        </RevoViewPort>
        {this.extraElements}
      </Host>
    );
  }
}

export interface RevoGridComponent extends GridRenderService {}
applyMixins(RevoGridComponent, [GridRenderService]);
