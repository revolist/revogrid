import {
  Component,
  Method,
  Event,
  EventEmitter,
  Prop,
  Listen,
} from '@stencil/core';
import debounce from 'lodash/debounce';

import { DSourceState, setItems } from '../../store/dataSource/data.store';
import { DRAGG_TEXT } from '../../utils/consts';
import RowOrderService from './order-row.service';
import { DimensionRows } from '../../types/dimension';
import {
  DataType,
  DimensionSettingsState,
  DragStartEvent,
  Observable,
  PositionItem,
} from '../../types/interfaces';
import { Cell } from '../../types/selection';

@Component({ tag: 'revogr-order-editor' })
export class OrderEditor {
  // #region Properties
  /** Parent element */
  @Prop() parent: HTMLElement;
  /** Dimension settings Y */
  @Prop() dimensionRow: Observable<DimensionSettingsState>;
  /** Dimension settings X */
  @Prop() dimensionCol: Observable<DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: Observable<DSourceState<DataType, DimensionRows>>;
  // #endregion

  // #region Events

  /** Row drag started */
  @Event({ eventName: 'rowdragstartinit', cancelable: true })
  rowDragStart: EventEmitter<{
    cell: Cell;
    text: string;
    pos: PositionItem;
    event: MouseEvent;
  }>;

  /** Row drag ended */
  @Event({ eventName: 'rowdragendinit', cancelable: true })
  rowDragEnd: EventEmitter;

  /** Row move */
  @Event({ eventName: 'rowdragmoveinit', cancelable: true }) rowDrag: EventEmitter<PositionItem>;

  /** Row mouse move */
  @Event({ eventName: 'rowdragmousemove', cancelable: true })rowMouseMove: EventEmitter<Cell>;

  /** Row dragged, new range ready to be applied */
  @Event({ eventName: 'rowdragendinit', cancelable: true }) rowDropped: EventEmitter<{
    from: number;
    to: number;
  }>;
  // #endregion

  // #region Private
  private rowOrderService: RowOrderService;
  private moveFunc: ((e: Cell) => void) | null;
  private rowMoveFunc = debounce((y: number) => {
    const rgRow = this.rowOrderService.move(y, this.getData());
    if (rgRow !== null) {
      this.rowDrag.emit(rgRow);
    }
  }, 5);
  // #endregion

  // #region Listeners
  @Listen('mouseleave', { target: 'document' })
  onMouseOut() {
    this.clearOrder();
  }

  /** Action finished inside of the document */
  @Listen('mouseup', { target: 'document' })
  onMouseUp(e: MouseEvent) {
    this.endOrder(e);
  }
  // #endregion

  // #region Methods
  @Method() async dragStart(e: DragStartEvent) {
    e.originalEvent.preventDefault();

    // extra check if previous ended
    if (this.moveFunc) {
      this.clearOrder();
    }

    const data = this.getData();
    const cell = this.rowOrderService.startOrder(e.originalEvent, data);
    const pos = this.rowOrderService.getRow(e.originalEvent.y, data);
    const dragStartEvent = this.rowDragStart.emit({
      cell,
      text: DRAGG_TEXT,
      pos,
      event: e.originalEvent,
    });
    if (dragStartEvent.defaultPrevented) {
      return;
    }

    this.moveFunc = (e: MouseEvent) => this.move(e);
    document.addEventListener('mousemove', this.moveFunc);
  }

  @Method() async endOrder(e: MouseEvent) {
    this.rowOrderService.endOrder(e, this.getData());
    this.clearOrder();
  }

  @Method() async clearOrder() {
    this.rowOrderService.clear();
    document.removeEventListener('mousemove', this.moveFunc);
    this.moveFunc = null;
    this.rowDragEnd.emit();
  }
  // #endregion

  move({ x, y }: { x: number; y: number }) {
    this.rowMouseMove.emit({ x, y });
    this.rowMoveFunc(y);
  }

  connectedCallback() {
    this.rowOrderService = new RowOrderService({
      positionChanged: (f, t) => this.onPositionChanged(f, t),
    });
  }

  private onPositionChanged(from: number, to: number) {
    const dropEvent = this.rowDropped.emit({ from, to });
    if (dropEvent.defaultPrevented) {
      return;
    }
    const items = [...this.dataStore.get('items')];
    const toMove = items.splice(from, 1);
    items.splice(to, 0, ...toMove);
    setItems(this.dataStore, items);
  }

  private getData() {
    return {
      el: this.parent,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
    };
  }
}
