import {
  Component,
  Event,
  Prop,
  EventEmitter,
  h,
  VNode,
  Host,
  Build,
} from '@stencil/core';

import {
  DATA_COL,
  DATA_ROW,
  DRAGGABLE_CLASS,
  DRAG_ICON_CLASS,
} from '../../utils/consts';
import ColumnService from '../data/column.service';
import { PADDING_DEPTH } from '../data/row-renderer';
import {
  BeforeCellRenderEvent,
  CellProps,
  ColumnDataSchemaModel,
  DragStartEvent,
  Providers,
  RowDrag,
} from '../../types/interfaces';

/**
 * Component is responsible for rendering cell
 * Main purpose is to track changes and understand what exactly need to be rerendered instead of full grid render
 */
@Component({
  tag: 'revogr-cell',
})
export class RevogridCellRenderer {
  // #region Properties
  /**
   * Additional data to pass to renderer
   * Used in plugins such as vue or react to pass root app entity to cells
   */
  @Prop() additionalData: any;
  /**
   * Column service
   */
  @Prop() columnService!: ColumnService;
  /**
   * Cached providers
   */
  @Prop() providers!: Providers;
  /**
   * Grouping depth
   */
  @Prop() depth: number;

  /**
   * Row props passed via property
   */

  /**
   * Row index viewport Y position
   */
  @Prop() rowIndex!: number;

  /**
   * Top cell side edge position in px
   */
  @Prop() rowStart!: number;
  /**
   * Bottom cell side edge position in px
   */
  @Prop() rowEnd!: number;

  /**
   * Row height in px
   */
  @Prop() rowSize!: number;

  /**
   * Column props passed via property
   */
  /**
   * Column index
   */
  @Prop() colIndex!: number;
  /**
   * Left side edge position in px
   */
  @Prop() colStart!: number;
  /**
   * Right side edge position in px
   */
  @Prop() colEnd!: number;
  /**
   * Column width
   */
  @Prop() colSize!: number;
  // #endregion
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

  render() {
    const model = this.columnService.rowDataModel(this.rowIndex, this.colIndex);

    // call before cell render
    const cellEvent = this.beforeCellRender.emit({
      column: {
        itemIndex: this.colIndex,
        start: this.colStart,
        end: this.colEnd,
        size: this.colSize,
      },
      row: {
        itemIndex: this.rowIndex,
        start: this.rowStart,
        end: this.rowEnd,
        size: this.rowSize,
      },
      model,
      rowType: this.providers.type,
      colType: this.columnService.type,
    });

    // if event was prevented
    if (cellEvent.defaultPrevented) {
      return;
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
    if (this.depth && !columnProps.itemIndex) {
      defaultProps.style.paddingLeft = `${PADDING_DEPTH * this.depth}px`;
    }
    const props = this.columnService.mergeProperties(
      rowProps.itemIndex,
      columnProps.itemIndex,
      defaultProps,
    );
    const tpl = this.columnService.columns[columnProps.itemIndex]?.cellTemplate;
    // if custom render
    if (tpl) {
      return (
        <Host {...props}>
          {tpl(h, { ...model, providers: this.providers }, this.additionalData)}
        </Host>
      );
    }
    // something is wrong with data
    if (!model.column) {
      if (Build.isDev) {
        console.error('Investigate column problem.', model);
      }
      return;
    }

    const els: (VNode | string)[] = [];
    if (model.column.rowDrag && isRowDragService(model.column.rowDrag, model)) {
      els.push(
        <span
          class={DRAGGABLE_CLASS}
          onMouseDown={originalEvent =>
            this.dragStartCell.emit({
              originalEvent,
              model,
            })
          }
        >
          <span class={DRAG_ICON_CLASS} />
        </span>,
      );
    }
    els.push(`${ColumnService.getData(model.model[model.prop])}`);
    // if regular render
    return <Host {...props}>{els}</Host>;
  }
}

/**
 * Checks if the given rowDrag is a service for dragging rows.
 */
function isRowDragService(
  rowDrag: RowDrag,
  model: ColumnDataSchemaModel,
): boolean {
  if (typeof rowDrag === 'function') {
    return rowDrag(model);
  }
  return !!rowDrag;
}
