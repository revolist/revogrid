import {
  Component,
  Host,
  Watch,
  Element,
  Event,
  Prop,
  VNode,
  EventEmitter,
  h,
  Method,
  State,
} from '@stencil/core';

import ColumnService from './column.service';
import { DATA_COL, DATA_ROW, ROW_FOCUSED_CLASS } from '../../utils/consts';

import { DSourceState, getSourceItem } from '@store';
import RowRenderer, { PADDING_DEPTH } from './row-renderer';
import GroupingRowRenderer from '../../plugins/groupingRow/grouping.row.renderer';
import { isGrouping } from '../../plugins/groupingRow/grouping.service';
import { DimensionCols, DimensionRows } from '@type';
import { RowHighlightPlugin } from './row-highlight.plugin';
import { convertVNodeToHTML } from '../vnode/vnode.utils';
import { CellRenderer } from './cell-renderer';
import {
  ViewportState,
  DimensionSettingsState,
  BeforeRowRenderEvent,
  Providers,
  ColumnRegular,
  DataType,
  CellProps,
  BeforeCellRenderEvent,
  DragStartEvent,
  ColumnDataSchemaModel,
  VirtualPositionItem,
  RangeArea,
  SelectionStoreState,
} from '@type';
import { Observable } from '../../utils/store.utils';

/**
 * This component is responsible for rendering data
 * Rows, columns, groups and cells
 */
@Component({
  tag: 'revogr-data',
  styleUrl: 'revogr-data-style.scss',
})
export class RevogrData {
  // #region Properties
  /**
   * Readonly mode
   */
  @Prop() readonly: boolean;
  /**
   * Range allowed
   */
  @Prop() range: boolean;

  /**
   * Defines property from which to read row class
   */
  @Prop() rowClass: string;
  /**
   * Additional data to pass to renderer
   * Used in plugins such as vue or react to pass root app entity to cells
   */
  @Prop() additionalData: any;
  /** Stores */
  /** Selection, range, focus for row selection */
  @Prop() rowSelectionStore!: Observable<SelectionStoreState>;
  /** Viewport Y */
  @Prop() viewportRow!: Observable<ViewportState>;
  /** Viewport X */
  @Prop() viewportCol!: Observable<ViewportState>;
  /** Dimension settings Y */
  @Prop() dimensionRow!: Observable<DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  /**
   * Column source
   */
  @Prop() colData!: Observable<DSourceState<ColumnRegular, DimensionCols>>;
  /**
   * Data rows source
   */
  @Prop() dataStore!: Observable<DSourceState<DataType, DimensionRows>>;
  /**
   * Row data type
   */
  @Prop({ reflect: true }) type!: DimensionRows;

  /**
   * Column data type
   */
  @Prop({ reflect: true }) colType!: DimensionCols | 'rowHeaders';

  /**
   * Prevent rendering until job is done.
   * Can be used for initial rendering performance improvement.
   * When several plugins require initial rendering this will prevent double initial rendering.
   */
  @Prop() jobsBeforeRender: Promise<any>[] = [];
  // #endregion

  /**
   * Before each row render
   */
  @Event() beforerowrender: EventEmitter<BeforeRowRenderEvent>;
  
  /**
   * When data render finished for the designated type
   */
  @Event() afterrender: EventEmitter<{ type: DimensionRows }>;
  /**
   * Before each cell render function. Allows to override cell properties
   */
  @Event({ eventName: 'beforecellrender' })
  beforeCellRender: EventEmitter<BeforeCellRenderEvent>;

  /**
   * Event emitted on cell drag start
   */
  @Event({ eventName: 'dragstartcell' })
  dragStartCell: EventEmitter<DragStartEvent>;

  /**
   * Pointed cell update.
   */
  @Method() async updateCell(e: {
    row: number; // virtual
    col: number; // virtual
  }) {
    // Stencil tweak to update cell content
    const cell = this.renderedRows.get(e.row)?.$children$?.[e.col];
    if (cell?.$attrs$?.redraw) {
      const children = await convertVNodeToHTML(
        this.element,
        cell.$attrs$.redraw,
      );
      cell.$elm$.innerHTML = children.html;
      cell.$key$ = Math.random();
    }
  }

  @Element() element!: Element;
  @State() providers: Providers;
  private columnService: ColumnService;
  private rowHighlightPlugin: RowHighlightPlugin;
  /**
   * Rendered rows - virtual index vs vnode
   */
  private renderedRows = new Map<number, VNode>();
  private rangeUnsubscribe: (() => void) | undefined;

  @Watch('dataStore') onDataStoreChange() {
    this.onStoreChange();
  }
  @Watch('colData') onColDataChange() {
    this.onStoreChange();
  }
  onStoreChange() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    // make sure we have correct data, before render
    this.providers = {
      type: this.type,
      readonly: this.readonly,
      data: this.dataStore,
      viewport: this.viewportCol,
      dimension: this.dimensionRow,
      selection: this.rowSelectionStore,
    };

    this.rangeUnsubscribe?.();
    this.rangeUnsubscribe = this.rowSelectionStore.onChange(
      'range',
      (e: RangeArea) =>
        this.rowHighlightPlugin.selectionChange(e, this.renderedRows),
    );
  }

  connectedCallback() {
    this.rowHighlightPlugin = new RowHighlightPlugin();
    this.onStoreChange();
  }

  disconnectedCallback() {
    this.columnService?.destroy();
    this.rangeUnsubscribe?.();
  }

  async componentWillRender() {
    return Promise.all(this.jobsBeforeRender);
  }

  componentDidRender() {
    this.afterrender.emit({ type: this.type });
  }

  render() {
    this.renderedRows = new Map();
    const columnsData = this.columnService.columns;
    if (!columnsData.length) {
      return;
    }
    const rows = this.viewportRow.get('items');
    if (!rows.length) {
      return;
    }
    const cols = this.viewportCol.get('items');
    if (!cols.length) {
      return;
    }
    const rowsEls: VNode[] = [];
    const depth = this.dataStore.get('groupingDepth');
    const groupingCustomRenderer = this.dataStore.get('groupingCustomRenderer');
    const groupDepth = this.columnService.hasGrouping ? depth : 0;
    for (let rgRow of rows) {
      const dataItem = getSourceItem(this.dataStore, rgRow.itemIndex);

      // #region Grouping
      if (isGrouping(dataItem)) {
        rowsEls.push(
          <GroupingRowRenderer
            {...rgRow}
            index={rgRow.itemIndex}
            model={dataItem}
            groupingCustomRenderer={groupingCustomRenderer}
            hasExpand={this.columnService.hasGrouping}
          />,
        );
        continue;
      }
      // #endregion
      const cells: (VNode | string | void)[] = [];

      // #region Cells
      for (let rgCol of cols) {
        const model = this.columnService.rowDataModel(
          rgRow.itemIndex,
          rgCol.itemIndex,
        );

        // call before cell render
        const cellEvent = this.triggerBeforeCellRender(model, rgRow, rgCol);

        // if event was prevented
        if (cellEvent.defaultPrevented) {
          continue;
        }

        const {
          detail: { column: columnProps, row: rowProps },
        } = cellEvent;

        const defaultProps: CellProps = {
          [DATA_COL]: columnProps.itemIndex,
          [DATA_ROW]: rowProps.itemIndex,
          style: {
            width: `${columnProps.size}px`,
            transform: `translateX(${columnProps.start}px)`,
            height: rowProps.size ? `${rowProps.size}px` : undefined,
          },
        };
        /**
         * For grouping, can be removed in the future and replaced with event
         */
        if (groupDepth && !columnProps.itemIndex && defaultProps.style) {
          defaultProps.style.paddingLeft = `${PADDING_DEPTH * groupDepth}px`;
        }

        const props = this.columnService.mergeProperties(
          rowProps.itemIndex,
          columnProps.itemIndex,
          defaultProps,
          model,
          columnsData[columnProps.itemIndex]?.cellProperties,
        );

        // Never use webcomponent for cell render
        // It's very slow because of webcomponent initialization takes time
        cells.push(
          <CellRenderer
            renderProps={{
              model,
              providers: this.providers,
              template: columnsData[columnProps.itemIndex]?.cellTemplate,
              additionalData: this.additionalData,
              dragStartCell: this.dragStartCell,
            }}
            cellProps={props}
          />,
        );
      }
      // #endregion

      // #region Rows
      let rowClass = this.rowClass
        ? this.columnService.getRowClass(rgRow.itemIndex, this.rowClass)
        : '';
      if (this.rowHighlightPlugin.isRowFocused(rgRow.itemIndex)) {
        rowClass += ` ${ROW_FOCUSED_CLASS}`;
      }
      const row: VNode = (
        <RowRenderer
          index={rgRow.itemIndex}
          rowClass={rowClass}
          size={rgRow.size}
          start={rgRow.start}
        >
          {cells}
        </RowRenderer>
      );
      this.beforerowrender.emit({
        node: row,
        item: rgRow,
        model: dataItem,
        colType: this.columnService.type,
        rowType: this.type,
      });
      rowsEls.push(row);
      this.renderedRows.set(rgRow.itemIndex, row);
      // #endregion
    }
    return (
      <Host>
        <slot />
        {rowsEls}
      </Host>
    );
  }

  triggerBeforeCellRender(
    model: ColumnDataSchemaModel,
    row: VirtualPositionItem,
    column: VirtualPositionItem,
  ) {
    return this.beforeCellRender.emit({
      column: { ...column },
      row: { ...row },
      model,
      rowType: model.type,
      colType: model.colType,
    });
  }
}
