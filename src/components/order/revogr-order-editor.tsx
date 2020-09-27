import {Component, Method, Event, EventEmitter, Prop, Listen} from '@stencil/core';
import { ObservableMap } from '@stencil/store';
import debounce from 'lodash/debounce';
import { RevoGrid, Selection } from '../../interfaces';
import { DataSourceState } from '../../store/dataSource/data.store';
import { DRAGG_TEXT } from '../../utils/consts';
import RowOrderService from './rowOrderService';

@Component({
	tag: 'revogr-order-editor'
})
export class OrderEditor {
	private rowOrderService: RowOrderService;
	private moveFunc: ((e: Selection.Cell) => void)|null;
	private rowMoveFunc = debounce((y: number) => {
		const row = this.rowOrderService.move(y, this.getData());
		if (row !== null) {
			this.internalRowDrag.emit(row);
		}
	}, 5);

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
	// --------------------------------------------------------------------------
	@Prop() parent: HTMLElement;
	@Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
	@Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

	/** Static stores, not expected to change during component lifetime */
	@Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;


  // --------------------------------------------------------------------------
  //
  //  Events
  //
	// --------------------------------------------------------------------------
	
	/** Row drag started */
	@Event({ cancelable: true }) internalRowDragStart: EventEmitter<{
		cell: Selection.Cell, text: string, pos: RevoGrid.PositionItem, event: MouseEvent
	}>;

	/** Row drag ended */
	@Event({ cancelable: true }) internalRowDragEnd: EventEmitter;

	/** Row move */
	@Event({ cancelable: true }) internalRowDrag: EventEmitter<RevoGrid.PositionItem>;

	/** Row mouse move */
	@Event({ cancelable: true }) internalRowMouseMove: EventEmitter<Selection.Cell>;

	/** Row dragged, new range ready to be applied */
	@Event({ cancelable: true }) initialRowDropped: EventEmitter<{from: number; to: number;}>;


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
	
	@Method() async dragStart(e: MouseEvent): Promise<void> {
			e.preventDefault();

			// extra check if previous ended
			if (this.moveFunc) {
					this.clearOrder();
			}

			const data = this.getData();
			const cell = this.rowOrderService.startOrder(e, data);
			const pos = this.rowOrderService.getRow(e.y, data);
			const dragStartEvent = this.internalRowDragStart.emit({ cell, text: DRAGG_TEXT, pos, event: e });
			if (dragStartEvent.defaultPrevented) {
					return;
			}

			this.moveFunc = (e: MouseEvent) => this.move(e);
			document.addEventListener('mousemove', this.moveFunc);
	}

	@Method() async endOrder(e: MouseEvent): Promise<void> {
			this.rowOrderService.endOrder(e, this.getData());
			this.clearOrder();
	}

	@Method() async clearOrder(): Promise<void> {
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
	
	move({x, y}: {x: number; y: number}): void {
		this.internalRowMouseMove.emit({ x, y });
		this.rowMoveFunc(y);
	}

	connectedCallback(): void {
		this.rowOrderService = new RowOrderService({
				positionChanged: (from, to) => {
						const dropEvent = this.initialRowDropped.emit({from, to});
						if (dropEvent.defaultPrevented) {
								return;
						}
						const items = this.dataStore.get('items');
						const toMove = items.splice(from, 1);
						items.splice(to, 0, ...toMove);
						this.dataStore.set('items', [...items]);
				}
		});
	}

	private getData() {
    return {
      el: this.parent,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state
    }
  }
}
