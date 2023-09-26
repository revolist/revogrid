import { Component, Method, Event, EventEmitter, Prop, Listen } from '@stencil/core';
import debounce from 'lodash/debounce';

import { DSourceState, setItems } from '../../store/dataSource/data.store';
import { DRAGG_TEXT } from '../../utils/consts';
import RowOrderService from './order-row.service';
import { DimensionRows } from '../../types/dimension';
import { DataType, DimensionSettingsState, DragStartEvent, Observable, PositionItem } from '../../types/interfaces';
import { Cell } from '../../types/selection';

@Component({ tag: 'revogr-order-editor' })
export class OrderEditor {
  private rowOrderService: RowOrderService;
  private moveFunc: ((e: Cell) => void) | null;
  private rowMoveFunc = debounce((y: number) => {
    const rgRow = this.rowOrderService.move(y, this.getData());
    if (rgRow !== null) {
      this.internalRowDrag.emit(rgRow);
    }
  }, 5);

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------
  @Prop() parent: HTMLElement;
  @Prop() dimensionRow: Observable<DimensionSettingsState>;
  @Prop() dimensionCol: Observable<DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: Observable<DSourceState<DataType, DimensionRows>>;

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  /** Row drag started */
  @Event({ cancelable: true }) internalRowDragStart: EventEmitter<{
    cell: Cell;
    text: string;
    pos: PositionItem;
    event: MouseEvent;
  }>;

  /** Row drag ended */
  @Event({ cancelable: true }) internalRowDragEnd: EventEmitter;

  /** Row move */
  @Event({ cancelable: true }) internalRowDrag: EventEmitter<PositionItem>;

  /** Row mouse move */
  @Event({ cancelable: true }) internalRowMouseMove: EventEmitter<Cell>;

  /** Row dragged, new range ready to be applied */
  @Event({ cancelable: true }) initialRowDropped: EventEmitter<{ from: number; to: number }>;

  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------

  @Listen('mouseleave', { target: 'document' })
  onMouseOut(): void {
    this.clearOrder();
  }

  /** Action finished inside of the document */
  @Listen('mouseup', { target: 'document' })
  onMouseUp(e: MouseEvent): void {
    this.endOrder(e);
  }

  // --------------------------------------------------------------------------
  //
  //  Methods
  //
  // --------------------------------------------------------------------------

  @Method() async dragStart(e: DragStartEvent) {
    e.originalEvent.preventDefault();

    // extra check if previous ended
    if (this.moveFunc) {
      this.clearOrder();
    }

    const data = this.getData();
    const cell = this.rowOrderService.startOrder(e.originalEvent, data);
    const pos = this.rowOrderService.getRow(e.originalEvent.y, data);
    const dragStartEvent = this.internalRowDragStart.emit({ cell, text: DRAGG_TEXT, pos, event: e.originalEvent });
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
    this.internalRowDragEnd.emit();
  }

  // --------------------------------------------------------------------------
  //
  //  Component methods
  //
  // --------------------------------------------------------------------------

  move({ x, y }: { x: number; y: number }): void {
    this.internalRowMouseMove.emit({ x, y });
    this.rowMoveFunc(y);
  }

  connectedCallback(): void {
    this.rowOrderService = new RowOrderService({ positionChanged: (f, t) => this.onPositionChanged(f, t) });
  }

  private onPositionChanged(from: number, to: number) {
    const dropEvent = this.initialRowDropped.emit({ from, to });
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
