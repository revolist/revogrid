import {Component, Method, Event, EventEmitter, Prop, Element, State, h} from '@stencil/core';
import { ObservableMap } from '@stencil/store';
import { RevoGrid, Selection } from '../../interfaces';
import { DataSourceState } from '../../store/dataSource/data.store';
import { DRAGG_TEXT } from '../../utils/consts';
import RowOrderService from './rowOrderService';

@Component({
    tag: 'revogr-order-editor',
    styleUrl: 'revogr-order-style.scss'
})
export class OrderEditor {
    private rowOrderService: RowOrderService;
    private dragElement: HTMLElement|null;
    @Element() element: HTMLElement;
    @State() activeDrag: {cell: Selection.Cell, text: string}|null = null;


    /** Static stores, not expected to change during component lifetime */
    @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;
    /** Row drag started */
    @Event() rowDragStart: EventEmitter<{cell: Selection.Cell, text: string}>;

    /** Row drag started */
    @Event() rowDragEnd: EventEmitter;

    /** Row dragged, new range ready to be applied */
    @Event() initialRowDropped: EventEmitter<{from: number; to: number;}>;

    private moveFunc: ((e: Selection.Cell) => void)|null;
    

    @Method() async dragStart(e: MouseEvent, data: {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState}): Promise<void> {
        e.preventDefault();
        if (this.moveFunc) {
            this.clearOrder();
        }


        this.rowOrderService.startOrder(e, data);
        const dragStartEvent = this.rowDragStart.emit({ cell: this.rowOrderService.current, text: DRAGG_TEXT });
        if (dragStartEvent.defaultPrevented) {
            return;
        }

        this.activeDrag = {
            ...dragStartEvent.detail,
            cell: {
                x: e.x,
                y: e.y
            }
        };
        this.moveFunc = (e: MouseEvent) => this.move(e, this.dragElement);
        document.addEventListener('mousemove', this.moveFunc);
    }

    @Method() async endOrder(e: MouseEvent, data: {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState}): Promise<void> {
        this.rowOrderService.endOrder(e, data);
        this.clearOrder();
    }

    @Method() async clearOrder(): Promise<void> {
        this.rowOrderService.clear();
        this.activeDrag = null;
        document.removeEventListener('mousemove', this.moveFunc);
        this.moveFunc = null;
        this.rowDragEnd.emit();
    }

    move({x, y}: {x: number; y: number}, el?: HTMLElement): void {
        if (!el) {
            return;
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
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

    componentDidRender(): void {
        this.moveFunc && this.moveFunc(this.activeDrag?.cell);
    }

    render() {
        if (this.activeDrag) {
            return <div class='draggable' ref={el => this.dragElement = el}><span class='revo-alt-icon'/>{this.activeDrag.text}</div>;
        }
    }
}
