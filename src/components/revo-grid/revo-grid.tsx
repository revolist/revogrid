import {Component, Prop, h, Watch, Element, Listen, Event, EventEmitter, Method} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

import ColumnDataProvider from '../../services/column.data.provider';
import {DataProvider} from '../../services/data.provider';
import {DataSourceState} from '../../store/dataSource/data.store';
import DimensionProvider from '../../services/dimension.provider';
import ViewportProvider from '../../services/viewport.provider';
import {Edition, Selection, RevoGrid, ThemeSpace} from '../../interfaces';
import ThemeService from '../../themeManager/themeService';
import { timeout } from '../../utils/utils';


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
  @Prop() rowHeaders: boolean = false;
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

  /** Custom editors register */
  @Prop() editors: Edition.Editors = {};


  /** Theme name */
  @Prop({ reflect: true, mutable: true }) theme: ThemeSpace.Theme = 'default';


  /** 
   * Row class property
   * Define this property in row object and this will be mapped as row class
   */
  @Prop({ reflect: true }) rowClass: string = '';


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


  
  // --------------------------------------------------------------------------
  //
  //  Methods
  //
  // --------------------------------------------------------------------------
  /** 
   * Refreshes data viewport.
   * Can be specific part as row or pinned row or 'all' by default. 
   */
  @Method() async refresh(type: RevoGrid.DimensionRows|'all' = 'all'): Promise<void> {
    this.dataProvider.refresh(type);
  }

  /** 
   * Scrolls view port to specified row index
   */
  @Method() async scrollToRow(coordinate: number = 0): Promise<void> {
    const y = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'row'
    });
    await this.scrollToCoordinate({ y });
  }


  /** Scrolls view port to specified column index */
  @Method() async scrollToColumnIndex(coordinate: number = 0): Promise<void> {
    const x = this.dimensionProvider.getViewPortPos({
      coordinate,
      dimension: 'col'
    });
    await this.scrollToCoordinate({ x });
  }

  /**  Scrolls view port to specified column prop */
  @Method() async scrollToColumnProp(prop: RevoGrid.ColumnProp): Promise<void> {
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

  /**  Scrolls view port to coordinate */
  @Method() async scrollToCoordinate(cell: Partial<Selection.Cell>): Promise<void> {
    await this.viewportElement.scrollToCoordinate(cell);
  }

  /**  Bring cell to edit mode */
  @Method() async setCellEdit(row: number, prop: RevoGrid.ColumnProp, rowSource: RevoGrid.DimensionRows = 'row'): Promise<void> {
    const col = ColumnDataProvider.getColumnByProp(this.columns, prop);
    if (col) {
      await timeout();
      this.viewportElement.setEdit(row, this.columnProvider.getColumnIndexByProp(prop, 'col'), col.pin || 'col', rowSource);
    }
  }
  
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------
  @Listen('internalCellEdit')
  onBeforeEdit(e: CustomEvent<Edition.BeforeSaveDataDetails>): void {
    e.cancelBubble = true;
    const { defaultPrevented, detail } = this.beforeEdit.emit(e.detail);
    // apply data
    setTimeout(() => {
      if (!defaultPrevented) {
        this.dataProvider.setCellData(detail);
        this.afterEdit.emit(detail);
      }
    }, 0);
  }

  @Listen('internalRangeDataApply')
  onBeforeRangeEdit(e: CustomEvent<Edition.BeforeRangeSaveDataDetails>): void {
    e.cancelBubble = true;
    const { defaultPrevented } = this.beforeRangeEdit.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
      return;
    }
    this.afterEdit.emit(e.detail);
  }

  @Listen('internalSelectionChanged')
  onRangeChanged(e: CustomEvent<Selection.ChangedRange>): void {
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
  onRowDropped(e: CustomEvent<{from: number; to: number;}>): void {
    e.cancelBubble = true;
    const {defaultPrevented} = this.rowOrderChanged.emit(e.detail);
    if (defaultPrevented) {
      e.preventDefault();
    }
  }

  @Listen('initialHeaderClick')
  onHeaderClick(e: CustomEvent<{column: RevoGrid.ColumnRegular, index: number}>): void {
    const {defaultPrevented} = this.headerClick.emit(e.detail.column);
    if (defaultPrevented) {
      return;
    }
    if (e.detail.column.sortable) {
      const order = e.detail.column.order && e.detail.column.order === 'asc' ? 'desc' : 'asc';

      // allow sort change
      const canSort = this.beforeSorting.emit({column: e.detail.column, order});
      if (canSort.defaultPrevented) {
        return;
      }
      const newCol = this.columnProvider.updateColumnSorting(e.detail.column, e.detail.index, order);

      // apply sort data
      const canSortApply = this.beforeSortingApply.emit({
        column: newCol, order
      });
      if (canSortApply.defaultPrevented) {
        return;
      }
      this.dataProvider.sort({[e.detail.column.prop]: order});
    }
  }

  @Listen('internalFocusCell')
  onCellFocus(e: CustomEvent<Edition.BeforeSaveDataDetails>): void {
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

  private uuid: string|null = null;
  private columnProvider: ColumnDataProvider;
  private dataProvider: DataProvider;
  private dimensionProvider: DimensionProvider;
  private viewportProvider: ViewportProvider;
  private themeService: ThemeService;

  @Element() element: HTMLElement;
  private viewportElement: HTMLRevogrViewportElement;


  @Watch('columns')
  columnChanged(newVal: RevoGrid.ColumnData) {
    this.columnProvider.setColumns(newVal);
    this.dataProvider.sort(this.columnProvider.order);
  }

  @Watch('theme')
  themeChanged(t: ThemeSpace.Theme) {
    this.themeService.register(t);

    this.dimensionProvider.setSettings({ originItemSize: this.themeService.rowSize, frameOffset: this.frameSize || 0 }, 'row');
    this.dimensionProvider.setSettings({ originItemSize: this.colSize, frameOffset: this.frameSize || 0 }, 'col');
  }

  @Watch('source')
  dataChanged(newVal: RevoGrid.DataType[]): void {
    let applySorting;
    if (this.dataProvider.hasSorting) {
      const event = this.beforeSourceSortingApply.emit();
      applySorting = !event.defaultPrevented;
    }
    this.dataProvider.setData(newVal, 'row', applySorting);
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
    this.themeService = new ThemeService({
      rowSize: this.rowSize
    });
    this.dimensionProvider = new DimensionProvider(this.viewportProvider);
    this.columnProvider = new ColumnDataProvider(this.dimensionProvider);
    this.dataProvider = new DataProvider(this.dimensionProvider);
    this.uuid = (new Date()).getTime().toString();
    this.themeChanged(this.theme);

    this.columnChanged(this.columns);
    this.dataChanged(this.source);
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
  }

  render() {
    return <revogr-viewport
      ref={e => this.viewportElement = e}
      onSetDimensionSize={e => this.dimensionProvider.setDimensionSize(e.detail.type, e.detail.sizes)}
      onSetViewportCoordinate={e => this.dimensionProvider.setViewPortCoordinate(e.detail)}
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
      editors={this.editors}/>;
  }
}
