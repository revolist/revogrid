import { Component, Prop, h, Watch, Element, Listen, Event, EventEmitter, Method, VNode, State, Host } from '@stencil/core';
import each from 'lodash/each';

import ColumnDataProvider, { ColumnCollection } from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import { getVisibleSourceItem } from '../../store/dataSource/data.store';
import DimensionProvider, { DimensionConfig } from '../../services/dimension.provider';
import ViewportProvider from '../../services/viewport.provider';
import { Edition, Selection, RevoGrid, ThemeSpace, RevoPlugin } from '../../interfaces';
import ThemeService from '../../themeManager/themeService';
import { timeout } from '../../utils';
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
import { rowDefinitionByType, rowDefinitionRemoveByType } from './grid.helpers';
import ColumnPlugin from '../../plugins/moveColumn/columnDragPlugin';

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid-style.scss',
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
   * Apply changes typed in editor on editor close except Escape cases
   * If custom editor in use @method getValue required
   * Check interfaces.d.ts @EditorBase for more info
   */
  @Prop() applyEditorChangesOnClose = false;

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
   * Apply changes typed in editor on editor close except Escape cases
   * If custom editor in use @method getValue required
   * Check interfaces.d.ts @EditorBase for more info
   */
   @Prop() focusTemplate: RevoGrid.FocusTemplateFunc;

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


  /** 
   * Additional data to be passed to plugins
   */
  @Prop() additionalData: any = {};

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  /**
   * contentsizechanged event.
   * Triggered when new content size applied.
   * Not including header size
   * Event is not returning size
   * To get actual size use getContentSize after event triggered
   */
  @Event() contentsizechanged: EventEmitter<RevoGrid.MultiDimensionType>;
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
   * Triggered after data applied or range changed.
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
  @Event() beforeange: EventEmitter<Selection.ChangedRange>;

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
  @Event() beforefocuslost: EventEmitter<FocusedData | null>;
  /**
   * Before data apply.
   * You can override data source here
   */
  @Event() beforesourceset: EventEmitter<{
    type: RevoGrid.DimensionRows;
    source: RevoGrid.DataType[];
  }>;

   /**
   * Before data apply.
   * You can override data source here
   */
  @Event({ eventName: 'before-any-source' }) beforeAnySource: EventEmitter<{
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
  @Event() aftercolumnresize: EventEmitter<{ [index: number]: RevoGrid.ColumnRegular }>;
  /**
   * Before row definition
   */
  @Event() beforerowdefinition: EventEmitter<{ vals: any; oldVals: any; }>;

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
    this.viewport?.setEdit(rgRow, this.columnProvider.getColumnIndexByProp(prop, 'rgCol'), rgCol.pin || 'rgCol', rowSource);
  }

  /**  Set focus range */
  @Method() async setCellsFocus(
    cellStart: Selection.Cell = { x: 0, y: 0 },
    cellEnd: Selection.Cell = { x: 0, y: 0 },
    colType = 'rgCol',
    rowType = 'rgRow',
  ) {
    this.viewport?.setFocus(colType, rowType, cellStart, cellEnd);
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
    const focused = await this.getFocused();
    const event = this.beforefocuslost.emit(focused);
    if (event.defaultPrevented) {
      return;
    }
    this.selectionStoreConnector.clearAll();
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
  @Method() async getFocused(): Promise<FocusedData | null> {
    return this.viewport?.getFocused();
  }

  /**
   * Get size of content
   * Including all pinned data
   */
  @Method() async getContentSize(): Promise<Selection.Cell> {
    return this.dimensionProvider?.getFullSize();
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

  private clickTrackForFocusClear: number | null = null;
  @Listen('mousedown', { target: 'document' }) mousedownHandle(e: MouseEvent) {
    this.clickTrackForFocusClear = e.screenX + e.screenY;
  }
  @Listen('mouseup', { target: 'document' }) mouseupHandle(e: MouseEvent) {
    if (e.defaultPrevented) {
      return;
    }
    const target = e.target as HTMLElement | null;
    const pos = e.screenX + e.screenY;
    // detect if mousemove then do nothing
    if (Math.abs(this.clickTrackForFocusClear - pos) > 10) {
      return;
    }

    // check if action finished inside of the document
    // clear data which is outside of grid
    // if event prevented or it is current table don't clear focus
    if (target?.closest(`[${UUID}="${this.uuid}"]`)) {
      return;
    }
    this.clearFocus();
  }

  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------

  /** DRAG AND DROP */
  @Listen('internalRowDragStart') onRowDragStarted(e: CustomEvent<{ pos: RevoGrid.PositionItem; text: string; event: MouseEvent }>) {
    // e.cancelBubble = true;
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
    // e.cancelBubble = true;
    this.orderService?.moveTip(e.detail);
  }

  @Listen('internalCellEdit') async onBeforeEdit(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    // e.cancelBubble = true;
    const { defaultPrevented, detail } = this.beforeedit.emit(e.detail);
    await timeout();
    // apply data
    if (!defaultPrevented) {
      this.dataProvider.setCellData(detail);
      this.afteredit.emit(detail);
    }
  }

  @Listen('internalRangeDataApply') onBeforeRangeEdit(e: CustomEvent<Edition.BeforeRangeSaveDataDetails>) {
    // e.cancelBubble = true;
    const { defaultPrevented, detail } = this.beforerangeedit.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.afteredit.emit(detail);
  }

  @Listen('internalSelectionChanged') onRangeChanged(e: CustomEvent<Selection.ChangedRange>) {
    // e.cancelBubble = true;
    const beforeange = this.beforeange.emit(e.detail);
    if (beforeange.defaultPrevented) {
      e.preventDefault();
    }
    const beforeFill = this.beforeautofill.emit(beforeange.detail);
    if (beforeFill.defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialRowDropped') onRowDropped(e: CustomEvent<{ from: number; to: number }>) {
    // e.cancelBubble = true;
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

  @Listen('beforeFocusCell') onCellFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>) {
    // e.cancelBubble = true;
    const { defaultPrevented } = this.beforecellfocus.emit(e.detail);
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

  @Element() element: HTMLRevoGridElement;

  @Watch('columns') columnChanged(newVal: RevoGrid.ColumnDataSchema[] = []) {
    // clear existing data
    this.dimensionProvider.drop();
    const columnGather = ColumnDataProvider.getColumns(newVal, 0, this.columnTypes);
    this.beforecolumnsset.emit(columnGather);
    for (let type of columnTypes) {
      const items = columnGather.columns[type];
      this.dimensionProvider.setNewColumns(type, items.length, ColumnDataProvider.getSizes(items), type !== 'rgCol');
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
    this.dimensionProvider.setSettings({ originItemSize: this.themeService.rowSize }, 'rgRow');
    this.dimensionProvider.setSettings({ originItemSize: this.colSize }, 'rgCol');
  }

  @Watch('source')
  @Watch('pinnedBottomSource')
  @Watch('pinnedTopSource')
  dataSourceChanged<T extends RevoGrid.DataType>(
    newVal: T[] = [],
    _: T[]|undefined,
    watchName: string
  ) {
    let type: RevoGrid.DimensionRows = 'rgRow';
    switch (watchName) {
      case 'pinnedBottomSource':
        type = 'rowPinEnd';
        break;
      case 'pinnedTopSource':
        type = 'rowPinStart';
        break;
      case 'source':
        type = 'rgRow';
        /** applied for source only for cross compatability between plugins */
        const beforesourceset = this.beforesourceset.emit({
          type,
          source: newVal,
        });
        newVal = beforesourceset.detail.source as T[];
        break;
    }
    this.dataSourceApply(newVal, type);
    /** applied for source only for cross compatability between plugins */
    if (watchName === 'source') {
      this.aftersourceset.emit({
        type,
        source: newVal,
      });
    }
  }

  @Watch('rowDefinitions') rowDefChanged(after: any, before?: any) {
    const { detail: {
      vals: newVal,
      oldVals: oldVal
    }} = this.beforerowdefinition.emit({
      vals: after,
      oldVals: before
    });
    // apply new vals
    const newRows = rowDefinitionByType(newVal);
    // clear current defs
    if (oldVal) {
      const remove = rowDefinitionRemoveByType(oldVal);
      // clear all old data and drop sizes
      each(remove, (_, t: RevoGrid.DimensionRows) => {
        this.dimensionProvider.clearSize(
          t,
          this.dataProvider.stores[t].store.get('source').length
        );
      });
    }
    if (!newVal.length) {
      return;
    }
    each(newRows, (r, k: RevoGrid.DimensionRows) => this.dimensionProvider.setCustomSizes(k, r.sizes || {}));
  }

  @Watch('trimmedRows') trimmedRowsChanged(newVal: Record<number, boolean> = {}) {
    this.addTrimmed(newVal);
  }
  /**
   * Grouping
   */
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
  /**
   * Stretch Plugin Apply
   */
  @Watch('stretch') applyStretch(isStretch: boolean | string) {
    if (isStretch === 'false') {
      isStretch = false;
    }
    let stretch = this.internalPlugins.filter(p => isStretchPlugin(p))[0];
    if ((typeof isStretch === 'boolean' && isStretch) || isStretch === 'true') {
      if (!stretch) {
        this.internalPlugins.push(
          new StretchColumn(this.element, {
            dataProvider: this.dataProvider,
            columnProvider: this.columnProvider,
            dimensionProvider: this.dimensionProvider,
          }),
        );
      } else if (isStretchPlugin(stretch)) {
        stretch.applyStretch(this.columnProvider.getRawColumns());
      }
    } else if (stretch) {
      const index = this.internalPlugins.indexOf(stretch);
      this.internalPlugins.splice(index, 1);
    }
  }

  /** External subscribe */
  @Event() filterconfigchanged: EventEmitter;
  @Watch('filter') applyFilter(cfg: boolean | ColumnFilterConfig) {
    this.filterconfigchanged.emit(cfg);
  }

  @Event() rowheaderschanged: EventEmitter;
  @Watch('rowHeaders') rowHeadersChange(rowHeaders?: RevoGrid.RowHeaders | boolean) {
    this.rowheaderschanged.emit(rowHeaders);
  }

  private dataSourceApply(source: RevoGrid.DataType[] = [], type: RevoGrid.DimensionRows = 'rgRow') {
    const beforesourceset = this.beforeAnySource.emit({
      type,
      source,
    });
    const newSource = [...beforesourceset.detail.source];
    return this.dataProvider.setData(newSource, type);
  }

  connectedCallback() {
    this.viewportProvider = new ViewportProvider();
    this.themeService = new ThemeService({
      rowSize: this.rowSize,
    });
    const dimensionProviderConfig: DimensionConfig = {
      realSizeChanged: (k: RevoGrid.MultiDimensionType) => this.contentsizechanged.emit(k),
    };
    this.dimensionProvider = new DimensionProvider(this.viewportProvider, dimensionProviderConfig);
    this.columnProvider = new ColumnDataProvider();
    this.selectionStoreConnector = new SelectionStoreConnector();
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

    this.internalPlugins.push(
      new GroupingRowPlugin(this.element, {
        dataProvider: this.dataProvider,
        columnProvider: this.columnProvider,
      }),
    );
    if (this.canMoveColumns) {
      this.internalPlugins.push(new ColumnPlugin(this.element, pluginData));
    }
    if (this.plugins) {
      this.plugins.forEach(p => {
        this.internalPlugins.push(
          new p(this.element, pluginData),
        );
      });
    }
    this.applyStretch(this.stretch);
    this.themeChanged(this.theme);
    this.columnChanged(this.columns);

    this.dataSourceChanged(this.source, undefined, 'source');
    this.dataSourceChanged(this.pinnedTopSource, undefined, 'pinnedTopSource');
    this.dataSourceChanged(this.pinnedBottomSource, undefined, 'pinnedBottomSource');

    this.trimmedRowsChanged(this.trimmedRows);
    this.rowDefChanged(this.rowDefinitions);
    this.groupingChanged(this.grouping);

    this.scrollingService = new GridScrollingService((e: RevoGrid.ViewPortScrollEvent) => {
      this.dimensionProvider.setViewPortCoordinate({
        coordinate: e.coordinate,
        type: e.dimension,
      });
      this.viewportscroll.emit(e);
    });
  }

  disconnectedCallback() {
    // destroy plugins on element disconnect
    each(this.internalPlugins, p => p.destroy());
    this.internalPlugins = [];
  }

  render() {
    const contentHeight = this.dimensionProvider.stores['rgRow'].store.get('realSize');
    this.viewport = new ViewportService(
      {
        columnProvider: this.columnProvider,
        dataProvider: this.dataProvider,
        dimensionProvider: this.dimensionProvider,
        viewportProvider: this.viewportProvider,
        uuid: this.uuid,
        scrollingService: this.scrollingService,
        orderService: this.orderService,
        selectionStoreConnector: this.selectionStoreConnector,
        resize: c => this.aftercolumnresize.emit(c),
      },
      contentHeight,
    );

    const views: VNode[] = [];
    if (this.rowHeaders && this.viewport.columns.length) {
      const anyView = this.viewport.columns[0];
      views.push(
        <revogr-row-headers
          height={contentHeight}
          rowClass={this.rowClass}
          resize={this.resize}
          dataPorts={anyView.dataPorts}
          headerProp={anyView.headerProp}
          uiid={anyView.prop[UUID]}
          rowHeaderColumn={typeof this.rowHeaders === 'object' ? this.rowHeaders : undefined}
          onScrollViewport={({ detail: e }: CustomEvent) => this.scrollingService.onScroll(e, 'headerRow')}
          onElementToScroll={({ detail: e }: CustomEvent) => this.scrollingService.registerElement(e, 'headerRow')}
        />,
      );
    }
    views.push(
      <ViewPortSections
        columnFilter={!!this.filter}
        resize={this.resize}
        readonly={this.readonly}
        range={this.range}
        rowClass={this.rowClass}
        editors={this.editors}
        applyEditorChangesOnClose={this.applyEditorChangesOnClose}
        useClipboard={this.useClipboard}
        columns={this.viewport.columns}
        onEdit={detail => {
          const event = this.beforeeditstart.emit(detail);
          if (!event.defaultPrevented) {
            this.selectionStoreConnector.setEdit(detail.isCancel ? false : detail.val);
          }
        }}
        registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
        onScroll={(details, k) => this.scrollingService.onScroll(details, k)}
        focusTemplate={this.focusTemplate}
      />,
    );
    return (
      <Host {...{ [`${UUID}`]: this.uuid }}>
        <RevoViewPort
          viewports={this.viewportProvider.stores}
          dimensions={this.dimensionProvider.stores}
          orderRef={e => (this.orderService = e)}
          registerElement={(e, k) => this.scrollingService.registerElement(e, k)}
          nakedClick={() => this.viewport.clearEdit()}
          onScroll={details => this.scrollingService.onScroll(details)}
        >
          {views}
        </RevoViewPort>
        {this.extraElements}
      </Host>
    );
  }
}
