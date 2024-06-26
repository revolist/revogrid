import { Component, Method, Event, EventEmitter, Prop } from '@stencil/core';
import debounce from 'lodash/debounce';

import { DSourceState, setItems } from '@store';
import { DRAGG_TEXT } from '../../utils/consts';
import RowOrderService from './order-row.service';
import { DimensionRows } from '@type';
import {
  DataType,
  DimensionSettingsState,
  DragStartEvent,
  Observable,
  PositionItem,
} from '@type';
import { Cell } from '@type';

/**
 * Component for handling row order editor.
 */
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

  /** Row drag ended started */
  @Event({ eventName: 'rowdragendinit' })
  rowDragEnd: EventEmitter;

  /** Row move started */
  @Event({ eventName: 'rowdragmoveinit', cancelable: true })
  rowDrag: EventEmitter<PositionItem>;

  /** Row mouse move started */
  @Event({ eventName: 'rowdragmousemove', cancelable: true })
  rowMouseMove: EventEmitter<Cell>;

  /** Row dragged, new range ready to be applied */
  @Event({ eventName: 'rowdropinit', cancelable: true })
  rowDropped: EventEmitter<{
    from: number;
    to: number;
  }>;
  // #endregion

  // #region Private
  private rowOrderService: RowOrderService;
  private events: {
    name: keyof DocumentEventMap;
    listener: (e: MouseEvent) => void;
  }[] = [];
  private rowMoveFunc = debounce((y: number) => {
    const rgRow = this.rowOrderService.move(y, this.getData());
    if (rgRow !== null) {
      this.rowDrag.emit(rgRow);
    }
  }, 5);
  // #endregion

  // #region Methods
  @Method() async dragStart(e: DragStartEvent) {
    e.originalEvent.preventDefault();

    // extra check if previous ended
    if (this.events.length) {
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

    const moveMove = (e: MouseEvent) => this.move(e);
    const mouseUp = (e: MouseEvent) => this.endOrder(e);
    const mouseLeave = () => this.clearOrder();

    this.events.push(
      {
        name: 'mousemove',
        listener: moveMove,
      },
      {
        name: 'mouseup',
        listener: mouseUp,
      },
      {
        name: 'mouseleave',
        listener: mouseLeave,
      },
    );
    document.addEventListener('mousemove', moveMove);
    // Action finished inside of the document
    document.addEventListener('mouseup', mouseUp);
    document.addEventListener('mouseleave', mouseLeave);
  }

  @Method() async endOrder(e: MouseEvent) {
    this.rowOrderService.endOrder(e, this.getData());
    this.clearOrder();
  }

  @Method() async clearOrder() {
    this.rowOrderService.clear();
    this.events.forEach(v => document.removeEventListener(v.name, v.listener));
    this.events.length = 0;
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
