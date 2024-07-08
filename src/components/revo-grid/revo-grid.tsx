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
import { timeout } from '../../utils/utils';
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
import ViewportService, { FocusedData } from './viewport.service';
import { ViewPortSections } from './viewport.section';
import GridScrollingService from './viewport.scrolling.service';
import { UUID } from '../../utils/consts';
import SelectionStoreConnector from '../../services/selection.store.connector';
import { OrdererService } from '../order/orderRenderer';
import StretchColumn, { isStretchPlugin } from '../../plugins/stretchPlugin';
import ColumnPlugin from '../../plugins/moveColumn/columnDragPlugin';

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid-style.scss'
})
export class RevoGridComponent {
  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  /** Excel like show rgRow indexe per rgRow */
  @Prop() rowHeaders: RevoGrid.RowHeaders | boolean;
  /**
   * Defines how many rows/columns should be rendered outside visible area.
   */
  @Prop() frameSize: number = 1;
  /**
   * Indicates default rgRow size.
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
   * Define this property in rgRow object and this will be mapped as rgRow class
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
   * Enables column move plugin
   * Can be boolean
   */
   @Prop() canMoveColumns: boolean = false;
  /**
   * Trimmed rows
   * Functionality which allows to hide rows from main data set
   * @trimmedRows are physical rgRow indexes to hide
   */
  @Prop() trimmedRows: Record<number, boolean> = {};

  /**
   * Enables export plugin
   * Can be boolean
   * Can be export options
   */
  @Prop() exporting = false;

  /**
   * Group models by provided properties
   * Define properties to be groped by
   */
  @Prop() grouping: GroupingOptions;

  /**
   * Defines stretch strategy for columns with @StretchColumn plugin
   * if there are more space on the right last column size would be increased
   */
  @Prop() stretch: boolean | string = true;

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
  @Event() beforeedit: EventEmitter<Edition.BeforeSaveDataDetails>;

  /**
   * Before range edit event.
   * Triggered before range data applied, when range selection happened.
   * Use e.preventDefault() to prevent edit data set and use you own.
   */
  @Event() beforerangeedit: EventEmitter<Edition.BeforeRangeSaveDataDetails>;

  /**
   * After edit.
   * Triggered when after data applied or Range changeged.
   */
  @Event() afteredit: EventEmitter<Edition.BeforeSaveDataDetails | Edition.BeforeRangeSaveDataDetails>;

  /**
   * Before autofill.
   * Triggered before autofill applied.
   * Use e.preventDefault() to prevent edit data apply.
   */
  @Event() beforeautofill: EventEmitter<Selection.ChangedRange>;

  /**
   * Before range apply.
   * Triggered before range applied.
   * Use e.preventDefault() to prevent range.
   */
  @Event() beforeaange: EventEmitter<Selection.ChangedRange>;

  /**
   * Triggered after focus render finished.
   * Can be used to access a focus element through @event.target
   */
  @Event() afterfocus: EventEmitter<{ model: any; column: RevoGrid.ColumnRegular; }>;

  /**
   * Before rgRow order apply.
   * Use e.preventDefault() to prevent rgRow order change.
   */
  @Event() roworderchanged: EventEmitter<{ from: number; to: number }>;

  /**
   * Before source update sorting apply.
   * Use this event if you intended to prevent sorting on data update.
   * Use e.preventDefault() to prevent sorting data change during rows source update.
   */
  @Event() beforesourcesortingapply: EventEmitter;

  /**
   * Before sorting apply.
   * Use e.preventDefault() to prevent sorting data change.
   */
  @Event() beforesortingapply: EventEmitter<{
    column: RevoGrid.ColumnRegular;
    order: 'desc' | 'asc';
    additive: boolean;
  }>;
  /**
   * Before sorting event.
   * Initial sorting triggered, if this event stops no other event called.
   * Use e.preventDefault() to prevent sorting.
   */
  @Event() beforesorting: EventEmitter<{
    column: RevoGrid.ColumnRegular;
    order: 'desc' | 'asc';
    additive: boolean;
  }>;

  /**
   * Row order change started.
   * Use e.preventDefault() to prevent rgRow order change.
   * Use e.text = 'new name' to change item name on start.
   */
  @Event() rowdragstart: EventEmitter<{ pos: RevoGrid.PositionItem; text: string }>;

  /**
   * On header click.
   */
  @Event() headerclick: EventEmitter<RevoGrid.ColumnRegular>;

  /**
   * Before cell focus changed.
   * Use e.preventDefault() to prevent cell focus change.
   */
  @Event() beforecellfocus: EventEmitter<Edition.BeforeSaveDataDetails>;

  /**
   * Before grid focus lost happened.
   * Use e.preventDefault() to prevent cell focus change.
   */
  @Event() beforefocuslost: EventEmitter<FocusedData|null>;
  /**
   * Before data apply.
   * You can override data source here
   */
  @Event() beforesourceset: EventEmitter<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

  /**  After rows updated */
  @Event() aftersourceset: EventEmitter<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

  /**  Before column update */
  @Event() beforecolumnsset: EventEmitter<ColumnCollection>;

  /**  Before column applied but after column set gathered and viewport updated */
  @Event() beforecolumnapplied: EventEmitter<ColumnCollection>;
  

  /**  Column updated */
  @Event() aftercolumnsset: EventEmitter<{
    columns: ColumnCollection;
    order: Record<RevoGrid.ColumnProp, 'asc' | 'desc'>;
  }>;

  /**
   * Before filter applied to data source
   * Use e.preventDefault() to prevent cell focus change
   * Update @collection if you wish to change filters
   */
  @Event() beforefilterapply: EventEmitter<{ collection: FilterCollection }>;

  /**
   * Before filter trimmed values
   * Use e.preventDefault() to prevent value trimming and filter apply
   * Update @collection if you wish to change filters
   * Update @itemsToFilter if you wish to filter indexes of trimming
   */
  @Event() beforefiltertrimmed: EventEmitter<{ collection: FilterCollection; itemsToFilter: Record<number, boolean> }>;

  /**
   * Before trimmed values
   * Use e.preventDefault() to prevent value trimming
   * Update @trimmed if you wish to filter indexes of trimming
   */
  @Event() beforetrimmed: EventEmitter<{ trimmed: Record<number, boolean>; trimmedType: string; type: string }>;

  /**
   * Notify trimmed applied
   */
  @Event() aftertrimmed: EventEmitter;

  /**
   * Triggered when view port scrolled
   */
  @Event() viewportscroll: EventEmitter<RevoGrid.ViewPortScrollEvent>;
  /**
   * Before export
   * Use e.preventDefault() to prevent export
   * Replace data in Event in case you want to modify it in export
   */
  @Event() beforeexport: EventEmitter<DataInput>;

  /**
   * Before edit started
   * Use e.preventDefault() to prevent edit
   */
  @Event() beforeeditstart: EventEmitter<Edition.BeforeSaveDataDetails>;
  /**
   * After column resize
   * Get resized columns
   */
  @Event() aftercolumnresize: EventEmitter<Record<RevoGrid.ColumnProp, RevoGrid.ColumnRegular>>;

  // --------------------------------------------------------------------------
  //
  //  Methods
  //
  // --------------------------------------------------------------------------
  /**
   * Refreshes data viewport.
   * Can be specific part as rgRow or pinned rgRow or 'all' by default.
   */
  @Method() async refresh(type: RevoGrid.DimensionRows | 'all' = 'all') {
    this.dataProvider.refresh(type);
  }

  /**  Scrolls view port to specified rgRow index */
  @Method() async scrollToRow(coordinate: number = 0) {
    const y = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'rgRow',
    });
    await this.scrollToCoordinate({ y });
  }

  /** Scrolls view port to specified column index */
  @Method() async scrollToColumnIndex(coordinate: number = 0) {
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'rgCol',
    });
    await this.scrollToCoordinate({ x });
  }

  /**  Scrolls view port to specified column prop */
  @Method() async scrollToColumnProp(prop: RevoGrid.ColumnProp) {
    const coordinate = this.columnProvider.getColumnIndexByProp(prop, 'rgCol');
    if (coordinate < 0) {
      // already on the screen
      return;
    }
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'rgCol',
    });
    await this.scrollToCoordinate({ x });
  }

  /** Update columns */
  @Method() async updateColumns(cols: RevoGrid.ColumnRegular[]) {
    this.columnProvider.updateColumns(cols);
  }

  /** Add trimmed by type */
  @Method() async addTrimmed(trimmed: Record<number, boolean>, trimmedType = 'external', type: RevoGrid.DimensionRows = 'rgRow') {
    const event = this.beforetrimmed.emit({
      trimmed,
      trimmedType,
      type,
    });
    if (event.defaultPrevented) {
      return event;
    }
    this.dataProvider.setTrimmed({ [trimmedType]: event.detail.trimmed }, type);
    this.aftertrimmed.emit();
    return event;
  }

  /**  Scrolls view port to coordinate */
  @Method() async scrollToCoordinate(cell: Partial<Selection.Cell>) {
    this.viewport?.scrollToCell(cell);
  }

  /**  Bring cell to edit mode */
  @Method() async setCellEdit(rgRow: number, prop: RevoGrid.ColumnProp, rowSource: RevoGrid.DimensionRows = 'rgRow') {
    const rgCol = ColumnDataProvider.getColumnByProp(this.columns, prop);
    if (!rgCol) {
      return;
    }
    await timeout();
    const colGroup = rgCol.pin || 'rgCol';
    this.viewport?.setEdit(rgRow, this.columnProvider.getColumnIndexByProp(prop, colGroup), colGroup, rowSource);
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
  @Method() async getSource(type: RevoGrid.DimensionRows = 'rgRow') {
    return this.dataProvider.stores[type].store.get('source');
  }

  /**
   * Get data from visible part of source
   * Trimmed/filtered rows will be excluded
   * @param type - type of source
   */
  @Method() async getVisibleSource(type: RevoGrid.DimensionRows = 'rgRow') {
    return getVisibleSourceItem(this.dataProvider.stores[type].store);
  }

  /**
   * Provides access to rows internal store observer
   * Can be used for plugin support
   * @param type - type of source
   */
  @Method() async getSourceStore(type: RevoGrid.DimensionRows = 'rgRow'): Promise<RowSource> {
    return this.dataProvider.stores[type].store;
  }
  /**
   * Provides access to column internal store observer
   * Can be used for plugin support
   * @param type - type of column
   */
  @Method() async getColumnStore(type: RevoGrid.DimensionCols = 'rgCol'): Promise<ColumnSource> {
    return this.columnProvider.stores[type].store;
  }

  /**
   * Update column sorting
   * @param column - full column details to update
   * @param index - virtual column index
   * @param order - order to apply
   */
  @Method() async updateColumnSorting(column: RevoGrid.ColumnRegular, index: number, order: 'asc' | 'desc', additive: boolean) {
    return this.columnProvider.updateColumnSorting(column, index, order, additive);
  }

  /**
   * Clears column sorting
   */
  @Method() async clearSorting() {
    this.columnProvider.clearSorting();
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
    const focused = this.viewport?.getFocused();
    const event = this.beforefocuslost.emit(focused);
    if (event.defaultPrevented) {
      return;
    }
    this.selectionStoreConnector.clearAll();
    this.viewport?.clearFocused();
  }

  /**
   * Get all active plugins instances
   */
  @Method() async getPlugins(): Promise<RevoPlugin.Plugin[]> {
    return [...this.internalPlugins];
  }

  /**
   * Get the currently focused cell.
   */
  @Method() async getFocused(): Promise<FocusedData|null> {
    return this.viewport?.getFocused();
  }

  /**
   * Get the currently selected Range.
   */
  @Method() async getSelectedRange(): Promise<Selection.RangeArea|null> {
    return this.viewport?.getSelectedRange();
  }


  // --------------------------------------------------------------------------
  //
  //  Listeners outside scope
  //
  // --------------------------------------------------------------------------
  
  /** Clear data which is outside of grid container */
  private handleOutsideClick({ target }: { target: HTMLElement | null }) {
    if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
      this.clearFocus();
    }
  }

  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------



  /** DRAG AND DROP */
  @Listen('internalRowDragStart') onRowDragStarted(e: CustomEvent<{ pos: RevoGrid.PositionItem; text: string; event: MouseEvent }>) {
    e.cancelBubble = true;
    const dragStart = this.rowdragstart.emit(e.detail);
    if (dragStart.defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.orderService?.start(this.element, { ...e.detail, ...dragStart.detail });
  }

  @Listen('internalRowDragEnd') onRowDragEnd() {
    this.orderService?.end();
  }

  @Listen('internalRowDrag') onRowDrag({ detail }: CustomEvent<RevoGrid.PositionItem>) {
    this.orderService?.move(detail);
  }

  @Listen('internalRowMouseMove') onRowMouseMove(e: CustomEvent<Selection.Cell>): void {
    e.cancelBubble = true;
    this.orderService?.moveTip(e.detail);
  }

  @Listen('internalCellEdit') async onBeforeEdit(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented, detail } = this.beforeedit.emit(e.detail);
    await timeout();
    // apply data
    if (!defaultPrevented) {
      this.dataProvider.setCellData(detail);
      this.afteredit.emit(detail);
    }
  }

  @Listen('internalRangeDataApply') onBeforeRangeEdit(e: CustomEvent<Edition.BeforeRangeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.beforerangeedit.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.afteredit.emit(e.detail);
  }

  @Listen('internalSelectionChanged') onRangeChanged(e: CustomEvent<Selection.ChangedRange>) {
    e.cancelBubble = true;
    const beforeaange = this.beforeaange.emit(e.detail);
    if (beforeaange.defaultPrevented) {
      e.preventDefault();
    }
    const beforeFill = this.beforeautofill.emit(e.detail);
    if (beforeFill.defaultPrevented) {
      return;
    }
  }

  @Listen('initialRowDropped') onRowDropped(e: CustomEvent<{ from: number; to: number }>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.roworderchanged.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialHeaderClick') onHeaderClick(e: CustomEvent<RevoGrid.InitialHeaderClick>) {
    const { defaultPrevented } = this.headerclick.emit({
      ...e.detail.column,
      originalEvent: e.detail.originalEvent,
    });
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('internalFocusCell') onCellFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    e.cancelBubble = true;
    const { defaultPrevented } = this.beforecellfocus.emit(e.detail);
    if (!this.canFocus || defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('internalNextStoreFocus') onCellStoreFocus(e: CustomEvent<Selection.Cell>) {
    this.selectionStoreConnector.beforeNextFocusCell(e.detail);
  }

  // --------------------------------------------------------------------------
  //
  //  Private Properties
  //
  // --------------------------------------------------------------------------

  // for internal plugin usage
  @State() extraElements: VNode[] = [];

  uuid: string | null = null;
  columnProvider: ColumnDataProvider;
  dataProvider: DataProvider;
  dimensionProvider: DimensionProvider;
  viewportProvider: ViewportProvider;
  private themeService: ThemeService;
  private viewport: ViewportService | null = null;

  private orderService: OrdererService;
  private selectionStoreConnector: SelectionStoreConnector;
  private scrollingService: GridScrollingService;

  /**
   * Plugins
   * Define plugins collection
   */
  private internalPlugins: RevoPlugin.Plugin[] = [];
  private subscribers: Record<string, () => void> = {};

  @Element() element: HTMLRevoGridElement;

  @Watch('columns') columnChanged(newVal: RevoGrid.ColumnDataSchema[] = []) {
    this.dimensionProvider.dropColumns();
    const columnGather = ColumnDataProvider.getColumns(newVal, 0, this.columnTypes);
    this.beforecolumnsset.emit(columnGather);
    for (let type of columnTypes) {
      const items = columnGather.columns[type];
      this.dimensionProvider.setColumns(type, items.length, ColumnDataProvider.getSizes(items), type !== 'rgCol');
    }
    this.beforecolumnapplied.emit(columnGather);
    const columns = this.columnProvider.setColumns(columnGather);
    this.aftercolumnsset.emit({
      columns,
      order: this.columnProvider.order,
    });
  }

  @Watch('theme') themeChanged(t: ThemeSpace.Theme) {
    this.themeService.register(t);
    this.dimensionProvider.setSettings({ originItemSize: this.themeService.rowSize, frameOffset: this.frameSize || 0 }, 'rgRow');
    this.dimensionProvider.setSettings({ originItemSize: this.colSize, frameOffset: this.frameSize || 0 }, 'rgCol');
  }

  @Watch('source') dataChanged(source: RevoGrid.DataType[] = []) {
    let newSource = [...source];
    const beforesourceset = this.beforesourceset.emit({
      type: 'rgRow',
      source: newSource,
    });
    newSource = beforesourceset.detail.source;

    newSource = this.dataProvider.setData(newSource, 'rgRow');
    this.aftersourceset.emit({
      type: 'rgRow',
      source: newSource,
    });
  }

  @Watch('pinnedBottomSource') dataBottomChanged(newVal: RevoGrid.DataType[] = []) {
    this.dataProvider.setData(newVal, 'rowPinEnd');
  }

  @Watch('pinnedTopSource') dataTopChanged(newVal: RevoGrid.DataType[] = []) {
    this.dataProvider.setData(newVal, 'rowPinStart');
  }

  @Watch('rowDefinitions') rowDefChanged(newVal: RevoGrid.RowDefinition[] = []) {
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

  @Watch('trimmedRows') trimmedRowsChanged(newVal: Record<number, boolean> = {}) {
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

  @Watch('stretch') applyStretch(isStretch: boolean | string) {
    if (isStretch === 'false') {
      isStretch = false;
    }
    let stretch = this.internalPlugins.filter(p => isStretchPlugin(p))[0];
    if (isStretch) {
      if(!stretch) {
        this.internalPlugins.push(new StretchColumn(this.element, this.dimensionProvider));
      } else {
        (stretch as StretchColumn).applyStretch(this.columnProvider.getRawColumns());
      }
    } else if (stretch) {
      const index = this.internalPlugins.indexOf(stretch);
      this.internalPlugins.splice(index, 1);
    }
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

    const pluginData = {
      data: this.dataProvider,
      column: this.columnProvider,
      dimension: this.dimensionProvider,
      viewport: this.viewportProvider,
      selection: this.selectionStoreConnector,
    };

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
        this.internalPlugins.push(new p(this.element, pluginData));
      });
    }

    if (this.canMoveColumns) {
      this.internalPlugins.push(new ColumnPlugin(this.element, pluginData));
    }

    this.internalPlugins.push(
      new GroupingRowPlugin(this.element, {
        dataProvider: this.dataProvider,
        columnProvider: this.columnProvider,
      }),
    );
    this.applyStretch(this.stretch);
    this.themeChanged(this.theme);
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
    this.trimmedRowsChanged(this.trimmedRows);
    this.rowDefChanged(this.rowDefinitions);
    this.groupingChanged(this.grouping);
    
    this.selectionStoreConnector = new SelectionStoreConnector();
    this.scrollingService = new GridScrollingService((e: RevoGrid.ViewPortScrollEvent) => {
      this.dimensionProvider.setViewPortCoordinate({
        coordinate: e.coordinate,
        type: e.dimension,
      });
      this.viewportscroll.emit(e);
    });
    this.subscribers = { 'click': this.handleOutsideClick.bind(this) };
    for (let type in this.subscribers) {
      document.addEventListener(type, this.subscribers[type]);
    }
  }

  disconnectedCallback() {
    // destroy plugins on element disconnect
    each(this.internalPlugins, p => p.destroy());
    this.internalPlugins = [];
    // clear events
    for (let type in this.subscribers) {
      document.removeEventListener(type, this.subscribers[type]);
      delete this.subscribers[type];
    }
  }

  render() {
    const contentHeight = this.dimensionProvider.stores['rgRow'].store.get('realSize');
    this.viewport = new ViewportService({
      columnProvider: this.columnProvider,
      dataProvider: this.dataProvider,
      dimensionProvider: this.dimensionProvider,
      viewportProvider: this.viewportProvider,
      uuid: this.uuid,
      scrollingService: this.scrollingService,
      orderService: this.orderService,
      selectionStoreConnector: this.selectionStoreConnector,
      resize: c => this.aftercolumnresize.emit(c)
    }, contentHeight);

    const views: VNode[] = [];
    if (this.rowHeaders) {
      const anyView = this.viewport.columns[0];
      views.push(<revogr-row-headers
        height={contentHeight}
        resize={this.resize}
        dataPorts={anyView.dataPorts}
        headerProp={anyView.headerProp}
        uiid={anyView.prop[UUID]}
        rowHeaderColumn={typeof this.rowHeaders === 'object' ? this.rowHeaders : undefined}
        onScrollViewport={({ detail: e }: CustomEvent) => this.scrollingService.onScroll(e, 'headerRow')}
        onElementToScroll={({ detail: e }: CustomEvent) => this.scrollingService.registerElement(e, 'headerRow')}
      />);
    }
    views.push(<ViewPortSections
      columnFilter={!!this.filter}
      resize={this.resize}
      readonly={this.readonly}
      range={this.range}
      rowClass={this.rowClass}
      editors={this.editors}
      useClipboard={this.useClipboard}
      columns={this.viewport.columns}
      onCancelEdit={() => {
        this.selectionStoreConnector.setEdit(false);
      }}
      onEdit={detail => {
        const event = this.beforeeditstart.emit(detail);
        if (!event.defaultPrevented) {
          this.selectionStoreConnector.setEdit(detail.val);
        }
      }}
      registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
      onScroll={details => this.scrollingService.onScroll(details)}
    />);
    return (
      <Host {...{ [`${UUID}`]: this.uuid }}>
        <RevoViewPort
          viewports={this.viewportProvider.stores}
          dimensions={this.dimensionProvider.stores}
          orderRef={e => (this.orderService = e)}
          registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
          nakedClick={() => this.viewport.clearEdit()}
          onScroll={details => this.scrollingService.onScroll(details)}
        >{views}</RevoViewPort>
        {this.extraElements}
      </Host>
    );
  }
}
