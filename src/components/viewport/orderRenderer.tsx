import { h, VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

type Props = { ref: (e: OrdererService) => void; };

/**
 * Draw drag
 */
export class OrdererService {
    private parentY: number = 0;
    constructor(private el: HTMLElement) {}
    start(pos: RevoGrid.PositionItem, parent: HTMLElement): void {
        this.parentY = parent.getBoundingClientRect().top;
        this.el.classList.remove('hidden');
        this.moveElement(pos.end - this.parentY);
    }
    end(): void {
        this.el.classList.add('hidden');
    }
    move(pos: RevoGrid.PositionItem): void {
        this.moveElement(pos.end - this.parentY);
    }

    private moveElement(y: number): void {
        this.el.style.transform = `translateY(${y}px)`;
    }
}


const OrderRenderer = ({ref}: Props, _children: VNode[]): VNode => {
    return <div class='drag-position hidden' ref={(e) => ref(new OrdererService(e))}></div>;
};
export default OrderRenderer;
