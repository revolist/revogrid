import { Component, Event, Prop, EventEmitter, h, VNode, Host } from '@stencil/core';
import {
  BeforeCellRenderEvent,
  DragStartEvent,
  RevoGrid,
} from '../../interfaces';
import {
  DATA_COL,
  DATA_ROW,
  DRAGGABLE_CLASS,
  DRAG_ICON_CLASS,
} from '../../utils/consts';
import ColumnService from './columnService';
import { PADDING_DEPTH } from './rowRenderer';
/**
 * Component is responsible for rendering cell
 * Main purpose is to track changes and understand what exactly need to be rerendered instead of full grid render
 */
@Component({
  tag: 'revogr-cell',
})
export class RevogridCellRenderer {
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
  @Prop() providers!: RevoGrid.Providers;
  /**
   * Grouping
   */
  @Prop() depth: number;

  /**
   * Row props passed via property
   */
  @Prop() rowIndex!: number;
  @Prop() rowStart!: number;
  @Prop() rowEnd!: number;
  @Prop() rowSize!: number;

  /**
   * Column props passed via property
   */
  @Prop() colIndex!: number;
  @Prop() colStart!: number;
  @Prop() colEnd!: number;
  @Prop() colSize!: number;

  /**
   * Before each cell render function. Allows to override cell properties
   */
  @Event({ eventName: 'before-cell-render' })
  beforeCellRender: EventEmitter<BeforeCellRenderEvent>;
  @Event({ eventName: 'dragStartCell' })
  dragStartCell: EventEmitter<DragStartEvent>;

  render() {
    const model = this.columnService.rowDataModel(this.rowIndex, this.colIndex);
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
    if (cellEvent.defaultPrevented) {
      return;
    }
    const {
      detail: { column: columnProps, row: rowProps },
    } = cellEvent;
    const defaultProps: RevoGrid.CellProps = {
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
      console.error('Investigate column problem');
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

function isRowDragService(
  rowDrag: RevoGrid.RowDrag,
  model: RevoGrid.ColumnDataSchemaModel,
): boolean {
  if (typeof rowDrag === 'function') {
    return rowDrag(model);
  }
  return !!rowDrag;
}
