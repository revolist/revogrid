import {
  Component,
  Prop,
  h,
  Watch,
  Element,
  Listen,
  Event,
  EventEmitter,
  Method,
  VNode,
  Host,
} from '@stencil/core';
import each from 'lodash/each';

import ColumnDataProvider, {
  ColumnCollection,
} from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import {
  DSourceState,
  getVisibleSourceItem,
} from '../../store/dataSource/data.store';
import DimensionProvider from '../../services/dimension.provider';
import ViewportProvider from '../../services/viewport.provider';
import ThemeService from '../../themeManager/theme.service';
import { timeout } from '../../utils';
import AutoSize, {
  AutoSizeColumnConfig,
} from '../../plugins/column.auto-size.plugin';

import {
  FilterPlugin,
  ColumnFilterConfig,
  FilterCollection,
} from '../../plugins/filter/filter.plugin';
import SortingPlugin from '../../plugins/sorting/sorting.plugin';
import ExportFilePlugin from '../../plugins/export/export.plugin';
import { DataInput } from '../../plugins/export/types';
import GroupingRowPlugin from '../../plugins/groupingRow/grouping.row.plugin';
import { GroupingOptions } from '../../plugins/groupingRow/grouping.row.types';
import ViewportService, { FocusedData } from './viewport.service';
import { DATA_SLOT, HEADER_SLOT } from './viewport.helpers';
import GridScrollingService from './viewport.scrolling.service';
import { UUID } from '../../utils/consts';
import SelectionStoreConnector from '../../services/selection.store.connector';
import OrderRenderer, { OrdererService } from '../order/order-renderer';
import StretchColumn, {
  isStretchPlugin,
} from '../../plugins/column.stretch.plugin';
import { rowDefinitionByType, rowDefinitionRemoveByType } from './grid.helpers';
import ColumnPlugin from '../../plugins/moveColumn/column.drag.plugin';
import { getPropertyFromEvent } from '../../utils/events';
import { isMobileDevice } from '../../utils/mobile';
import {
  MultiDimensionType,
  DimensionRows,
  DimensionCols,
  DimensionType,
  DimensionTypeCol,
} from '../../types/dimension';
import {
  RowHeaders,
  ColumnRegular,
  ColumnGrouping,
  DataType,
  RowDefinition,
  ColumnType,
  FocusTemplateFunc,
  PositionItem,
  ColumnProp,
  ViewPortScrollEvent,
  InitialHeaderClick,
  ColumnDataSchema,
  Observable,
  AllDimensionType,
} from '../../types/interfaces';
import {
  Editors,
  BeforeSaveDataDetails,
  BeforeRangeSaveDataDetails,
  Cell,
  ChangedRange,
  RangeArea,
  AfterEditEvent,
} from '../../types/selection';
import { Theme } from '../../types/theme';
import {
  PluginBaseComponent,
  PluginExternalConstructor,
} from '../../types/plugin';
import { HeaderProperties, PluginProviders } from '../..';

/**
 * Revogrid - High-performance, customizable grid library for managing large datasets.
 *
 * :::tip
 * Read [type definition file](https://github.com/revolist/revogrid/blob/master/src/interfaces.d.ts) for the full interface information.
 * All complex property types such as `ColumnRegular`, `ColumnProp`, `ColumnDataSchemaModel` can be found there.
 * :::
 *
 * :::tip
 * For a comprehensive events guide, check the [dependency tree](#Dependencies).
 * All events propagate to the root level of the grid.
 * :::
 *
 * @slot data-{column-type}-{row-type}. @example data-rgCol-rgRow - main data slot. Applies extra elements in <revogr-data />.
 * @slot focus-{column-type}-{row-type}. @example focus-rgCol-rgRow - focus layer for main data. Applies extra elements in <revogr-focus />.
 */
@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid-style.scss',
})
export class RevoGridComponent {
  // #region Properties
  /** Excel like functionality.
   * Show row numbers.
   * Also can be used for custom row header render if object provided.
   */
  @Prop() rowHeaders: RowHeaders | boolean;

  /**
   * Defines how many rows/columns should be rendered outside visible area.
   */
  @Prop() frameSize = 1;

  /**
   * Indicates default rgRow size.
   * By default 0, means theme package size will be applied
   *
   * Alternatively you can use `rowSize` to reset viewport
   */
  @Prop() rowSize = 0;

  /** Indicates default column size. */
  @Prop() colSize = 100;

  /** When true, user can range selection. */
  @Prop() range = false;

  /** When true, grid in read only mode. */
  @Prop() readonly = false;

  /** When true, columns are resizable. */
  @Prop() resize = false;

  /** When true cell focus appear. */
  @Prop() canFocus = true;

  /** When true enable clipboard. */
  @Prop() useClipboard = true;

  /**
   * Columns - defines an array of grid columns.
   * Can be column or grouped column.
   */
  @Prop() columns: (ColumnRegular | ColumnGrouping)[] = [];
  /**
   * Source - defines main data source.
   * Can be an Object or 2 dimensional array([][]);
   * Keys/indexes referenced from columns Prop.
   */
  @Prop() source: DataType[] = [];

  /** Pinned top Source: {[T in ColumnProp]: any} - defines pinned top rows data source. */
  @Prop() pinnedTopSource: DataType[] = [];

  /** Pinned bottom Source: {[T in ColumnProp]: any} - defines pinned bottom rows data source. */
  @Prop() pinnedBottomSource: DataType[] = [];

  /** Custom row properies to be applied. See `RowDefinition` for more info. */
  @Prop() rowDefinitions: RowDefinition[] = [];

  /** Custom editors register. */
  @Prop() editors: Editors = {};

  /**
   * Apply changes in editor when closed except 'Escape' cases.
   * If custom editor in use method getValue required.
   * Check interfaces.d.ts `EditorBase` for more info.
   */
  @Prop() applyOnClose = false;

  /**
   * Custom grid plugins.
   * Has to be predefined during first grid init.
   * Every plugin should be inherited from BasePlugin.
   */
  @Prop() plugins: PluginExternalConstructor[];

  /**
   * Column Types Format.
   * Every type represent multiple column properties.
   * Types will be merged but can be replaced with column properties.
   * Types were made as separate objects to be reusable per multiple columns.
   */
  @Prop() columnTypes: { [name: string]: ColumnType } = {};

  /** Theme name. */
  @Prop({ reflect: true, mutable: true }) theme: Theme = 'default';

  /**
   * Row class property mapping.
   * Map custom classes to rows from row object data.
   * Define this property in rgRow object and this will be mapped as rgRow class.
   */
  @Prop({ reflect: true }) rowClass = '';

  /**
   * Autosize config.
   * Enables columns autoSize.
   * For more details check `autoSizeColumn` plugin.
   * By default disabled, hence operation is not performance efficient.
   * `true` to enable with default params (double header separator click for autosize).
   * Or define config. See `AutoSizeColumnConfig` for more details.
   */
  @Prop() autoSizeColumn: boolean | AutoSizeColumnConfig = false;

  /**
   * Enables filter plugin.
   * Can be boolean.
   * Or can be filter collection See `FilterCollection` for more info.
   */
  @Prop() filter: boolean | ColumnFilterConfig = false;

  /**
   * Apply changes typed in editor on editor close except Escape cases.
   * If custom editor in use method `getValue` required.
   * Check `interfaces.d.ts` `EditorBase` for more info.
   */
  @Prop() focusTemplate: FocusTemplateFunc;

  /**
   * Enable column move plugin.
   */
  @Prop() canMoveColumns = false;
  /**
   * Trimmed rows.
   * Functionality which allows to hide rows from main data set.
   * `trimmedRows` are physical `rgRow` indexes to hide.
   */
  @Prop() trimmedRows: Record<number, boolean> = {};

  /**
   * Enable export plugin.
   */
  @Prop() exporting = false;

  /**
   * Group rows based on this property.
   * Define properties to be groped by grouping plugin See `GroupingOptions`.
   */
  @Prop() grouping: GroupingOptions;

  /**
   * Stretch strategy for columns by `StretchColumn` plugin.
   * For example if there are more space on the right last column size would be increased.
   */
  @Prop() stretch: boolean | string = true;

  /**
   * Additional data to be passed to plugins, renders or editors.
   * For example if you need to pass Vue component instance.
   */
  @Prop() additionalData: any = {};

  /**
   * Disable lazy rendering mode for the `X axis`.
   * Use when not many columns present and you don't need rerenader cells during scroll.
   * Can be used for initial rendering performance improvement.
   */
  @Prop() disableVirtualX = false;
  /**
   * Disable lazy rendering mode for the `Y axis`.
   * Use when not many rows present and you don't need rerenader cells during scroll.
   * Can be used for initial rendering performance improvement.
   */
  @Prop() disableVirtualY = false;

  /**
   * Please only hide the attribution if you are subscribed to Pro version
   */
  @Prop() hideAttribution = false;

  /**
   * Prevent rendering until job is done.
   * Can be used for initial rendering performance improvement.
   * When several plugins require initial rendering this will prevent double initial rendering.
   */
  @Prop() jobsBeforeRender: Promise<any>[] = [];

  /**
   * Register new virtual node inside of grid.
   * Used for additional items creation such as plugin elements.
   * Should be set before grid render inside of plugins.
   */
  @Prop() registerVNode: VNode[] = [];

  // #endregion

  // #region Events
  /**
   * New content size has been applied. The size excludes the header.
   * Currently, the event responsible for applying the new content size does not provide the actual size.
   * To retrieve the actual content size, you can utilize the `getContentSize` function after the event has been triggered.
   */
  @Event() contentsizechanged: EventEmitter<MultiDimensionType>;

  /**
   * This event is triggered before the data is edited.
   * To prevent the default behavior of editing data and use your own implementation, call `e.preventDefault()`.
   * To override the edit result with your own value, set the `e.val` property to your desired value.
   */
  @Event() beforeedit: EventEmitter<BeforeSaveDataDetails>;

  /**
   * This event is triggered before applying range data, specifically when a range selection occurs.
   * To customize the data and prevent the default edit data from being set, you can call `e.preventDefault()`.
   */
  @Event() beforerangeedit: EventEmitter<BeforeRangeSaveDataDetails>;

  /**
   * Triggered after data applied or range changed.
   */
  @Event() afteredit: EventEmitter<AfterEditEvent>;

  /**
   * This event is triggered before autofill is applied.
   * To prevent the default behavior of applying the edit data, you can call `e.preventDefault()`.
   */
  @Event() beforeautofill: EventEmitter<ChangedRange>;

  /**
   * Triggered before range applied.
   * Use e.preventDefault() to prevent range.
   */
  @Event() beforeange: EventEmitter<ChangedRange>;

  /**
   * Triggered after focus render finished.
   * Can be used to access a focus element through `event.target`
   */
  @Event() afterfocus: EventEmitter<{
    model: any;
    column: ColumnRegular;
  }>;

  /**
   * This event is triggered before the order of `rgRow` is applied.
   * To prevent the default behavior of changing the order of `rgRow`, you can call `e.preventDefault()`.
   */
  @Event() roworderchanged: EventEmitter<{ from: number; to: number }>;

  /**
   * Triggered by sorting.plugin.ts
   * Before sorting apply.
   * Use e.preventDefault() to prevent sorting data change.
   */
  @Event() beforesortingapply: EventEmitter<{
    column: ColumnRegular;
    order: 'desc' | 'asc';
    additive: boolean;
  }>;

  /**
   * Triggered by sorting.plugin.ts
   * Before sorting event.
   * Initial sorting triggered, if this event stops no other event called.
   * Use e.preventDefault() to prevent sorting.
   */
  @Event() beforesorting: EventEmitter<{
    column: ColumnRegular;
    order: 'desc' | 'asc';
    additive: boolean;
  }>;

  /**
   * This event is triggered when the row order change is started.
   * To prevent the default behavior of changing the row order, you can call `e.preventDefault()`.
   * To change the item name at the start of the row order change, you can set `e.text` to the desired new name.
   */
  @Event() rowdragstart: EventEmitter<{
    pos: PositionItem;
    text: string;
  }>;

  /**
   * On header click.
   */
  @Event() headerclick: EventEmitter<ColumnRegular>;

  /**
   * This event is triggered before the cell focus is changed.
   * To prevent the default behavior of changing the cell focus, you can call `e.preventDefault()`.
   */
  @Event() beforecellfocus: EventEmitter<BeforeSaveDataDetails>;

  /**
   * This event is triggered before the grid focus is lost.
   * To prevent the default behavior of changing the cell focus, you can call `e.preventDefault()`.
   */
  @Event() beforefocuslost: EventEmitter<FocusedData | null>;

  /**
   * Before main source/rows data apply.
   * You can override data source here
   */
  @Event() beforesourceset: EventEmitter<{
    type: DimensionRows;
    source: DataType[];
  }>;

  /**
   * Before data apply on any source type. Can be source from pinned and main viewport.
   * You can override data source here
   */
  @Event() beforeanysource: EventEmitter<{
    type: DimensionRows;
    source: DataType[];
  }>;

  /**
   * After main source/rows updated
   */
  @Event() aftersourceset: EventEmitter<{
    type: DimensionRows;
    source: DataType[];
  }>;

  /**
   * Emitted after each source update, whether from the pinned or main viewport.
   * Useful for tracking all changes originating from sources in both the pinned and main viewports.
   */
  @Event() afteranysource: EventEmitter<{
    type: DimensionRows;
    source: DataType[];
  }>;

  /**
   * Emitted before a column update is applied.
   * Listeners can use this event to perform any necessary actions or modifications before the column update is finalized.
   */
  @Event() beforecolumnsset: EventEmitter<ColumnCollection>;

  /**
   * Emitted before a column update is applied, after the column set is gathered and the viewport is updated.
   * Useful for performing actions or modifications before the final application of the column update.
   */
  @Event() beforecolumnapplied: EventEmitter<ColumnCollection>;

  /**  Column updated */
  @Event() aftercolumnsset: EventEmitter<{
    columns: ColumnCollection;
    order: Record<ColumnProp, 'asc' | 'desc'>;
  }>;

  /**
   * Emitted before applying a filter to the data source.
   * Use e.preventDefault() to prevent cell focus change.
   * Modify the @collection if you need to change filters.
   */
  @Event() beforefilterapply: EventEmitter<{ collection: FilterCollection }>;

  /**
   * Emitted before applying a filter to the data source.
   * Use e.preventDefault() to prevent the default behavior of trimming values and applying the filter.
   * Modify the `collection` property if you want to change the filters.
   * Modify the `itemsToFilter` property if you want to filter the indexes for trimming.
   */
  @Event() beforefiltertrimmed: EventEmitter<{
    collection: FilterCollection;
    itemsToFilter: Record<number, boolean>;
  }>;

  /**
   * Emitted before trimming values.
   * Use e.preventDefault() to prevent the default behavior of trimming values.
   * Modify the `trimmed` property if you want to filter the indexes for trimming.
   */
  @Event() beforetrimmed: EventEmitter<{
    trimmed: Record<number, boolean>;
    trimmedType: string;
    type: string;
  }>;

  /**
   * Emitted after trimmed values have been applied.
   * Useful for notifying when trimming of values has taken place.
   */
  @Event() aftertrimmed: EventEmitter;

  /**
   * Emitted when the viewport is scrolled.
   * Useful for tracking viewport scrolling events.
   */
  @Event() viewportscroll: EventEmitter<ViewPortScrollEvent>;

  /**
   * Before export
   * Use e.preventDefault() to prevent export
   * Replace data in Event in case you want to modify it in export
   */
  @Event() beforeexport: EventEmitter<DataInput>;

  /**
   * Emitted before editing starts.
   * Use e.preventDefault() to prevent the default edit behavior.
   */
  @Event() beforeeditstart: EventEmitter<BeforeSaveDataDetails>;

  /**
   * Emitted after column resizing.
   * Useful for retrieving the resized columns.
   */
  @Event() aftercolumnresize: EventEmitter<{
    [index: number]: ColumnRegular;
  }>;

  /**
   * Emitted before the row definition is applied.
   * Useful for modifying or preventing the default row definition behavior.
   */
  @Event() beforerowdefinition: EventEmitter<{ vals: any; oldVals: any }>;

  /**
   * Emitted when the filter configuration is changed
   */
  @Event() filterconfigchanged: EventEmitter;

  /**
   * Emmited when the row headers are changed.
   */
  @Event() rowheaderschanged: EventEmitter;

  /**
   * Emmited before the grid is rendered.
   */
  @Event() beforegridrender: EventEmitter;

  /**
   * Emmited after the grid is initialized. Connected to the DOM.
   */
  @Event() aftergridinit: EventEmitter;

  // #endregion

  // #region Methods
  /**
   * Refreshes data viewport.
   * Can be specific part as rgRow or pinned rgRow or 'all' by default.
   */
  @Method() async refresh(type: DimensionRows | 'all' = 'all') {
    this.dataProvider.refresh(type);
  }

  /**
   * Sets data at specified cell.
   * Useful for performance optimization.
   * No viewport update will be triggered.
   */
  @Method() async setDataAt(
    data: {
      row: number;
      col: number;
    } & AllDimensionType,
  ) {
    const dataElement: HTMLRevogrDataElement | null =
      this.element.querySelector(
        `revogr-data[type="${data.rowType}"][col-type="${data.colType}"]`,
      );
    return dataElement?.updateCell({
      row: data.row,
      col: data.col,
    });
  }

  /**
   * Scrolls viewport to specified row by index.
   */
  @Method() async scrollToRow(coordinate = 0) {
    const y = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'rgRow',
    });
    await this.scrollToCoordinate({ y });
  }

  /**
   * Scrolls viewport to specified column by index.
   */
  @Method() async scrollToColumnIndex(coordinate = 0) {
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'rgCol',
    });
    await this.scrollToCoordinate({ x });
  }

  /**
   * Scrolls viewport to specified column by prop
   */
  @Method() async scrollToColumnProp(
    prop: ColumnProp,
    dimension: DimensionTypeCol = 'rgCol',
  ) {
    const coordinate = this.columnProvider.getColumnIndexByProp(
      prop,
      dimension,
    );
    if (coordinate < 0) {
      // already on the screen
      return;
    }
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension,
    });
    await this.scrollToCoordinate({ x });
  }

  /** Update columns */
  @Method() async updateColumns(cols: ColumnRegular[]) {
    this.columnProvider.updateColumns(cols);
  }

  /** Add trimmed by type */
  @Method() async addTrimmed(
    trimmed: Record<number, boolean>,
    trimmedType = 'external',
    type: DimensionRows = 'rgRow',
  ) {
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
  @Method() async scrollToCoordinate(cell: Partial<Cell>) {
    this.viewport?.scrollToCell(cell);
  }

  /**  Open editor for cell. */
  @Method() async setCellEdit(
    rgRow: number,
    prop: ColumnProp,
    rowSource: DimensionRows = 'rgRow',
  ) {
    const rgCol = ColumnDataProvider.getColumnByProp(this.columns, prop);
    if (!rgCol) {
      return;
    }
    await timeout();
    const colGroup = rgCol.pin || 'rgCol';
    this.viewport?.setEdit(
      rgRow,
      this.columnProvider.getColumnIndexByProp(prop, colGroup),
      colGroup,
      rowSource,
    );
  }

  /**  Set focus range. */
  @Method() async setCellsFocus(
    cellStart: Cell = { x: 0, y: 0 },
    cellEnd: Cell = { x: 0, y: 0 },
    colType = 'rgCol',
    rowType = 'rgRow',
  ) {
    this.viewport?.setFocus(colType, rowType, cellStart, cellEnd);
  }

  /**  Get data from source */
  @Method() async getSource(type: DimensionRows = 'rgRow') {
    return this.dataProvider.stores[type].store.get('source');
  }

  /**
   * Get data from visible part of source
   * Trimmed/filtered rows will be excluded
   * @param type - type of source
   */
  @Method() async getVisibleSource(type: DimensionRows = 'rgRow') {
    return getVisibleSourceItem(this.dataProvider.stores[type].store);
  }

  /**
   * Provides access to rows internal store observer
   * Can be used for plugin support
   * @param type - type of source
   */
  @Method() async getSourceStore(
    type: DimensionRows = 'rgRow',
  ): Promise<Observable<DSourceState<DataType, DimensionRows>>> {
    return this.dataProvider.stores[type].store;
  }
  /**
   * Provides access to column internal store observer
   * Can be used for plugin support
   * @param type - type of column
   */
  @Method() async getColumnStore(
    type: DimensionCols = 'rgCol',
  ): Promise<Observable<DSourceState<ColumnRegular, DimensionCols>>> {
    return this.columnProvider.stores[type].store;
  }

  /**
   * Update column sorting
   * @param column - full column details to update
   * @param index - virtual column index
   * @param order - order to apply
   */
  @Method() async updateColumnSorting(
    column: ColumnRegular,
    index: number,
    order: 'asc' | 'desc',
    additive: boolean,
  ) {
    return this.columnProvider.updateColumnSorting(
      column,
      index,
      order,
      additive,
    );
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
  @Method() async getColumns(): Promise<ColumnRegular[]> {
    return this.columnProvider.getColumns();
  }

  /**
   * Clear current grid focus. Grid has no longer focus on it.
   */
  @Method() async clearFocus() {
    const focused = this.viewport?.getFocused();
    const event = this.beforefocuslost.emit(focused);
    if (event.defaultPrevented) {
      return;
    }
    this.selectionStoreConnector.clearAll();
  }

  /**
   * Get all active plugins instances
   */
  @Method() async getPlugins(): Promise<PluginBaseComponent[]> {
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
  @Method() async getContentSize(): Promise<Cell> {
    return this.dimensionProvider?.getFullSize();
  }
  /**
   * Get the currently selected Range.
   */
  @Method() async getSelectedRange(): Promise<RangeArea | null> {
    return this.viewport?.getSelectedRange();
  }

  // #endregion

  // #region Listeners outside scope
  private clickTrackForFocusClear: number | null = null;
  @Listen('touchstart', { target: 'document' })
  @Listen('mousedown', { target: 'document' })
  mousedownHandle(event: MouseEvent | TouchEvent) {
    const screenX = getPropertyFromEvent(event, 'screenX');
    const screenY = getPropertyFromEvent(event, 'screenY');
    if (screenX === null || screenY === null) {
      return;
    }

    this.clickTrackForFocusClear = screenX + screenY;
  }
  /**
   * To keep your elements from losing focus use mouseup/touchend e.preventDefault();
   */
  @Listen('touchend', { target: 'document' })
  @Listen('mouseup', { target: 'document' })
  mouseupHandle(event: MouseEvent | TouchEvent) {
    const screenX = getPropertyFromEvent(event, 'screenX');
    const screenY = getPropertyFromEvent(event, 'screenY');
    if (screenX === null || screenY === null) {
      return;
    }

    if (event.defaultPrevented) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const pos = screenX + screenY;
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
  // #endregion

  // #region Listeners
  /** Drag events */
  @Listen('rowdragstartinit') onRowDragStarted(
    e: CustomEvent<{
      pos: PositionItem;
      text: string;
      event: MouseEvent;
    }>,
  ) {
    const dragStart = this.rowdragstart.emit(e.detail);
    if (dragStart.defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.orderService?.start(this.element, {
      ...e.detail,
      ...dragStart.detail,
    });
  }

  @Listen('rowdragendinit') onRowDragEnd() {
    this.orderService?.end();
  }

  @Listen('rowdragmoveinit') onRowDrag({ detail }: CustomEvent<PositionItem>) {
    this.orderService?.move(detail);
  }

  @Listen('rowdragmousemove') onRowMouseMove(e: CustomEvent<Cell>) {
    this.orderService?.moveTip(e.detail);
  }

  @Listen('celleditapply') async onCellEdit(
    e: CustomEvent<BeforeSaveDataDetails>,
  ) {
    const { defaultPrevented, detail } = this.beforeedit.emit(e.detail);
    await timeout();
    // apply data
    if (!defaultPrevented) {
      this.dataProvider.setCellData(detail);

      // @feature: incrimental update for cells
      // this.dataProvider.setCellData(detail, false);
      // await this.setDataAt({
      //   row: detail.rowIndex,
      //   col: detail.colIndex,
      //   rowType: detail.type,
      //   colType: detail.colType,
      // });
      this.afteredit.emit(detail);
    }
  }

  @Listen('rangeeditapply') onRangeEdit(
    e: CustomEvent<BeforeRangeSaveDataDetails>,
  ) {
    const { defaultPrevented, detail } = this.beforerangeedit.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.dataProvider.setRangeData(detail.data, detail.type);
    this.afteredit.emit(detail);
  }

  @Listen('selectionchangeinit') onRangeChanged(e: CustomEvent<ChangedRange>) {
    const beforeange = this.beforeange.emit(e.detail);
    if (beforeange.defaultPrevented) {
      e.preventDefault();
    }
    const beforeFill = this.beforeautofill.emit(beforeange.detail);
    if (beforeFill.defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('rowdropinit') onRowDropped(
    e: CustomEvent<{ from: number; to: number }>,
  ) {
    // e.cancelBubble = true;
    const { defaultPrevented } = this.roworderchanged.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('beforeheaderclick') onHeaderClick(
    e: CustomEvent<InitialHeaderClick>,
  ) {
    const { defaultPrevented } = this.headerclick.emit({
      ...e.detail.column,
      originalEvent: e.detail.originalEvent,
    });
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('beforecellfocusinit') onCellFocus(
    e: CustomEvent<BeforeSaveDataDetails>,
  ) {
    const { defaultPrevented } = this.beforecellfocus.emit(e.detail);
    if (!this.canFocus || defaultPrevented) {
      e.preventDefault();
    }
  }

  // #endregion

  // #region Private Properties
  @Element() element: HTMLRevoGridElement;
  private extraElements: VNode[] = [];

  // UUID required to support multiple grids in one page and avoid collision
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
  private internalPlugins: PluginBaseComponent[] = [];
  // #endregion

  // #region Watchers
  @Watch('columnTypes') columnTypesChanged() {
    // Column format change will trigger column structure update
    this.columnChanged(this.columns);
  }
  @Watch('columns') columnChanged(newVal: ColumnDataSchema[] = []) {
    const columnGather = ColumnDataProvider.getColumns(
      newVal,
      0,
      this.columnTypes,
    );
    this.beforecolumnsset.emit(columnGather);
    this.dimensionProvider.applyNewColumns(
      columnGather.columns,
      this.disableVirtualX,
    );
    this.beforecolumnapplied.emit(columnGather);
    const columns = this.columnProvider.setColumns(columnGather);
    this.aftercolumnsset.emit({
      columns,
      order: this.columnProvider.order,
    });
  }

  @Watch('disableVirtualX') disableVirtualXChanged(
    newVal = false,
    prevVal = false,
  ) {
    if (newVal === prevVal) {
      return;
    }
    this.columnChanged(this.columns);
  }

  @Watch('rowSize') rowSizeChanged(s: number) {
    // clear existing data
    this.dimensionProvider.setSettings({ originItemSize: s }, 'rgRow');
    this.rowDefChanged(this.rowDefinitions, this.rowDefinitions);
  }

  @Watch('theme') themeChanged(
    t: Theme,
    _?: Theme,
    __ = 'theme',
    init = false,
  ) {
    this.themeService.register(t);
    this.dimensionProvider.setSettings(
      { originItemSize: this.themeService.rowSize },
      'rgRow',
    );
    this.dimensionProvider.setSettings(
      { originItemSize: this.colSize },
      'rgCol',
    );
    // if theme change we need to reapply row size and reset viewport
    if (!init) {
      // clear existing data
      this.dimensionProvider.setSettings(
        { originItemSize: this.themeService.rowSize },
        'rgRow',
      );
      this.rowDefChanged(
        // for cases when some custom size present and not
        this.rowDefinitions.length
          ? this.rowDefinitions
          : [
              {
                type: 'rgRow',
                size: this.themeService.rowSize,
                index: 0,
              },
            ],
        this.rowDefinitions,
      );
    }
  }

  @Watch('source')
  @Watch('pinnedBottomSource')
  @Watch('pinnedTopSource')
  dataSourceChanged<T extends DataType>(
    newVal: T[] = [],
    _: T[] | undefined,
    watchName: string,
  ) {
    let type: DimensionRows = 'rgRow';
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
    const beforesourceset = this.beforeanysource.emit({
      type,
      source: newVal,
    });
    const newSource = [...beforesourceset.detail.source];
    this.dataProvider.setData(newSource, type, this.disableVirtualY);

    /** applied for source only for cross compatability between plugins */
    if (watchName === 'source') {
      this.aftersourceset.emit({
        type,
        source: newVal,
      });
    }
    this.afteranysource.emit({
      type,
      source: newVal,
    });
  }

  @Watch('disableVirtualY') disableVirtualYChanged(
    newVal = false,
    prevVal = false,
  ) {
    if (newVal === prevVal) {
      return;
    }
    this.dataSourceChanged(this.source, this.source, 'source');
  }

  @Watch('rowDefinitions') rowDefChanged(
    after: RowDefinition[],
    before?: RowDefinition[],
  ) {
    const {
      detail: { vals: newVal, oldVals: oldVal },
    } = this.beforerowdefinition.emit({
      vals: after,
      oldVals: before,
    });
    // apply new vals
    const newRows = rowDefinitionByType(newVal);
    // clear current defs
    if (oldVal) {
      const remove = rowDefinitionRemoveByType(oldVal);
      // clear all old data and drop sizes
      each(remove, (_, t: DimensionRows) => {
        this.dimensionProvider.clearSize(
          t,
          this.dataProvider.stores[t].store.get('source').length,
        );
      });
    }
    if (!newVal.length) {
      return;
    }
    each(newRows, (r, k: DimensionRows) =>
      this.dimensionProvider.setCustomSizes(k, r.sizes || {}),
    );
  }

  @Watch('trimmedRows') trimmedRowsChanged(
    newVal: Record<number, boolean> = {},
  ) {
    this.addTrimmed(newVal);
  }
  /**
   * Grouping
   */
  @Watch('grouping') groupingChanged(newVal: GroupingOptions = {}) {
    let grPlugin: GroupingRowPlugin | undefined;
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
        const pluginData: PluginProviders = {
          data: this.dataProvider,
          column: this.columnProvider,
          dimension: this.dimensionProvider,
          viewport: this.viewportProvider,
          selection: this.selectionStoreConnector,
        };
        this.internalPlugins.push(new StretchColumn(this.element, pluginData));
      } else if (isStretchPlugin(stretch)) {
        stretch.applyStretch(this.columnProvider.getRawColumns());
      }
    } else if (stretch) {
      const index = this.internalPlugins.indexOf(stretch);
      this.internalPlugins.splice(index, 1);
    }
  }

  @Watch('filter') applyFilter(cfg: boolean | ColumnFilterConfig) {
    this.filterconfigchanged.emit(cfg);
  }

  @Watch('rowHeaders') rowHeadersChange(rowHeaders?: RowHeaders | boolean) {
    this.rowheaderschanged.emit(rowHeaders);
  }

  /**
   * Register external VNodes
   */
  @Watch('registerVNode') registerOutsideVNodes(elements: VNode[] = []) {
    this.extraElements = [...this.extraElements, ...elements];
  }
  // #endregion

  componentWillRender() {
    const event = this.beforegridrender.emit();
    if (event.defaultPrevented) {
      return false;
    }
    return Promise.all(this.jobsBeforeRender);
  }

  connectedCallback() {
    // #region Setup Providers
    this.viewportProvider = new ViewportProvider();
    this.themeService = new ThemeService({
      rowSize: this.rowSize,
    });
    this.dimensionProvider = new DimensionProvider(this.viewportProvider, {
      realSizeChanged: (k: MultiDimensionType) =>
        this.contentsizechanged.emit(k),
    });
    this.columnProvider = new ColumnDataProvider();
    this.selectionStoreConnector = new SelectionStoreConnector();
    this.dataProvider = new DataProvider(this.dimensionProvider);
    // #endregion

    // generate uuid for this grid
    this.uuid = `${new Date().getTime()}-rvgrid`;

    this.registerOutsideVNodes(this.registerVNode);

    // #region Plugins
    // pass data provider to plugins
    const pluginData: PluginProviders = {
      data: this.dataProvider,
      column: this.columnProvider,
      dimension: this.dimensionProvider,
      viewport: this.viewportProvider,
      selection: this.selectionStoreConnector,
    };

    // register auto size plugin
    if (this.autoSizeColumn) {
      this.internalPlugins.push(
        new AutoSize(
          this.element,
          pluginData,
          typeof this.autoSizeColumn === 'object'
            ? this.autoSizeColumn
            : undefined,
        ),
      );
    }

    // register filter plugin
    if (this.filter) {
      this.internalPlugins.push(
        new FilterPlugin(
          this.element,
          pluginData,
          this.uuid,
          typeof this.filter === 'object' ? this.filter : undefined,
        ),
      );
    }

    // register export plugin
    if (this.exporting) {
      this.internalPlugins.push(new ExportFilePlugin(this.element, pluginData));
    }

    // register sorting plugin
    this.internalPlugins.push(new SortingPlugin(this.element, pluginData));

    // register grouping plugin
    this.internalPlugins.push(new GroupingRowPlugin(this.element, pluginData));
    if (this.canMoveColumns) {
      this.internalPlugins.push(new ColumnPlugin(this.element, pluginData));
    }

    // register user plugins
    if (this.plugins) {
      this.plugins.forEach(p => {
        this.internalPlugins.push(new p(this.element, pluginData));
      });
    }
    // #endregion

    // set data
    this.applyStretch(this.stretch);
    this.themeChanged(this.theme, undefined, undefined, true);
    this.columnChanged(this.columns);
    this.dataSourceChanged(this.source, undefined, 'source');
    this.dataSourceChanged(this.pinnedTopSource, undefined, 'pinnedTopSource');
    this.dataSourceChanged(
      this.pinnedBottomSource,
      undefined,
      'pinnedBottomSource',
    );
    this.trimmedRowsChanged(this.trimmedRows);
    this.rowDefChanged(this.rowDefinitions);
    this.groupingChanged(this.grouping);

    // init scrolling service
    this.scrollingService = new GridScrollingService(
      (e: ViewPortScrollEvent) => {
        this.dimensionProvider.setViewPortCoordinate({
          coordinate: e.coordinate,
          type: e.dimension,
        });
        this.viewportscroll.emit(e);
      },
    );

    this.aftergridinit.emit();
  }

  disconnectedCallback() {
    // destroy plugins on element disconnect
    this.internalPlugins.forEach(p => p.destroy());
    this.internalPlugins = [];
  }

  render() {
    const contentHeight =
      this.dimensionProvider.stores['rgRow'].store.get('realSize');

    // init viewport service helpers
    this.viewport = new ViewportService(
      {
        columnProvider: this.columnProvider,
        dataProvider: this.dataProvider,
        dimensionProvider: this.dimensionProvider,
        viewportProvider: this.viewportProvider,
        scrollingService: this.scrollingService,
        orderService: this.orderService,
        selectionStoreConnector: this.selectionStoreConnector,
        disableVirtualX: this.disableVirtualX,
        disableVirtualY: this.disableVirtualY,
        resize: c => this.aftercolumnresize.emit(c),
      },
      contentHeight,
    );

    // #region ViewportSections
    /**
     * The code renders a viewport divided into sections.
     * It starts by rendering the pinned start, data, and pinned end sections.
     * Within each section, it renders columns along with their headers, pinned top, center data, and pinned bottom.
     * The code iterates over the columns and their data to generate the view port's HTML structure.
     */

    const viewportSections: (VNode | VNode[])[] = [];

    // Row headers setting
    if (this.rowHeaders && this.viewport.columns.length) {
      const anyView = this.viewport.columns[0];
      viewportSections.push(
        <revogr-row-headers
          additionalData={this.additionalData}
          height={contentHeight}
          rowClass={this.rowClass}
          resize={this.resize}
          dataPorts={anyView.dataPorts}
          headerProp={anyView.headerProp}
          jobsBeforeRender={this.jobsBeforeRender}
          rowHeaderColumn={
            typeof this.rowHeaders === 'object' ? this.rowHeaders : undefined
          }
          onScrollview={({ detail: e }: CustomEvent) =>
            this.scrollingService.proxyScroll(e, 'headerRow')
          }
          onRef={({ detail: e }: CustomEvent) =>
            this.scrollingService.registerElement(e, 'headerRow')
          }
        />,
      );
    }

    // Viewport section render
    const isMobile = isMobileDevice();
    const viewPortHtml: VNode[] = [];

    // Render viewports column(horizontal sections)
    for (let view of this.viewport.columns) {
      const headerProperties: HeaderProperties = {
        ...view.headerProp,
        type: view.type,
        additionalData: this.additionalData,
        viewportCol: view.viewportCol,
        selectionStore: view.columnSelectionStore,
        canResize: this.resize,
        readonly: this.readonly,
        columnFilter: !!this.filter,
      };
      // Column headers
      const dataViews: VNode[] = [
        <revogr-header {...headerProperties} slot={HEADER_SLOT} />,
      ];

      // Render viewport data (vertical sections)
      view.dataPorts.forEach(data => {
        const key = `${data.type}_${view.type}`;
        const dataView = (
          <revogr-overlay-selection
            {...data}
            isMobileDevice={isMobile}
            selectionStore={data.segmentSelectionStore}
            onSelectall={() => this.selectionStoreConnector.selectAll()}
            editors={this.editors}
            readonly={this.readonly}
            range={this.range}
            useClipboard={this.useClipboard}
            applyChangesOnClose={this.applyOnClose}
            additionalData={this.additionalData}
            slot={data.slot}
            onCanceledit={() => this.selectionStoreConnector.setEdit(false)}
            onSetedit={({ detail }) => {
              const event = this.beforeeditstart.emit(detail);
              if (!event.defaultPrevented) {
                this.selectionStoreConnector.setEdit(detail.val);
              }
            }}
          >
            <revogr-data
              {...data}
              colType={view.type}
              key={key}
              readonly={this.readonly}
              range={this.range}
              rowClass={this.rowClass}
              rowSelectionStore={data.rowSelectionStore}
              additionalData={this.additionalData}
              jobsBeforeRender={this.jobsBeforeRender}
              slot={DATA_SLOT}
            >
              <slot name={`data-${view.type}-${data.type}`} />
            </revogr-data>
            <revogr-temp-range
              selectionStore={data.segmentSelectionStore}
              dimensionRow={data.dimensionRow}
              dimensionCol={data.dimensionCol}
            />
            <revogr-focus
              colData={data.colData}
              dataStore={data.dataStore}
              focusTemplate={this.focusTemplate}
              rowType={data.type}
              colType={view.type}
              selectionStore={data.segmentSelectionStore}
              dimensionRow={data.dimensionRow}
              dimensionCol={data.dimensionCol}
            >
              <slot name={`focus-${view.type}-${data.type}`} />
            </revogr-focus>
          </revogr-overlay-selection>
        );

        dataViews.push(dataView);
      });

      // Add viewport scroll in the end
      viewPortHtml.push(
        <revogr-viewport-scroll
          {...view.prop}
          ref={el =>
            this.scrollingService.registerElement(el, `${view.prop.key}`)
          }
          onScrollviewport={e =>
            this.scrollingService.proxyScroll(e.detail, `${view.prop.key}`)
          }
          onScrollviewportsilent={e =>
            this.scrollingService.scrollSilentService(
              e.detail,
              `${view.prop.key}`,
            )
          }
        >
          {dataViews}
        </revogr-viewport-scroll>,
      );
    }

    viewportSections.push(viewPortHtml);
    // #endregion

    const typeRow: DimensionType = 'rgRow';
    const typeCol: DimensionType = 'rgCol';

    const viewports = this.viewportProvider.stores;
    const dimensions = this.dimensionProvider.stores;

    return (
      <Host {...{ [`${UUID}`]: this.uuid }}>
        {this.hideAttribution ? null : (
          <revogr-attribution class="attribution" />
        )}
        <div
          class="main-viewport"
          onClick={(e: MouseEvent) => {
            if (e.currentTarget === e.target) {
              this.viewport.clearEdit();
            }
          }}
        >
          <div class="viewports">
            <slot name="viewport" />
            {viewportSections}
            <revogr-scroll-virtual
              class="vertical"
              dimension={typeRow}
              viewportStore={viewports[typeRow].store}
              dimensionStore={dimensions[typeRow].store}
              ref={el => this.scrollingService.registerElement(el, 'rowScroll')}
              onScrollvirtual={e => this.scrollingService.proxyScroll(e.detail)}
            />
            <OrderRenderer ref={e => (this.orderService = e)} />
          </div>
        </div>
        <revogr-scroll-virtual
          class="horizontal"
          dimension={typeCol}
          viewportStore={viewports[typeCol].store}
          dimensionStore={dimensions[typeCol].store}
          ref={el => this.scrollingService.registerElement(el, 'colScroll')}
          onScrollvirtual={e => this.scrollingService.proxyScroll(e.detail)}
        />
        {this.extraElements}
      </Host>
    );
  }
}
