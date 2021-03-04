import { h, VNode } from '@stencil/core';
import { RevoGrid, Selection } from '../../interfaces';

type Props = { ref: { (e: OrdererService): void } };

/**
 * Draw drag
 */
export class OrdererService {
  private parentY: number = 0;
  el!: HTMLElement;
  row!: HTMLElement;
  text!: HTMLElement;
  draggable!: HTMLElement;

  start(parent: HTMLElement, { pos, text, event }: { pos: RevoGrid.PositionItem; text: string; event: MouseEvent }): void {
    const { top } = parent.getBoundingClientRect();
    this.parentY = top;
    if (this.text) {
      this.text.innerText = text;
    }
    this.move(pos);
    this.moveTip({ x: event.x, y: event.y });
    this.el?.classList.remove('hidden');
  }
  end(): void {
    this.el?.classList.add('hidden');
  }
  move(pos: RevoGrid.PositionItem): void {
    this.moveElement(pos.end - this.parentY);
  }
  moveTip({ x, y }: Selection.Cell): void {
    if (!this.draggable) {
      return;
    }
    this.draggable.style.left = `${x}px`;
    this.draggable.style.top = `${y}px`;
  }

  private moveElement(y: number): void {
    if (!this.row) {
      return;
    }
    this.row.style.transform = `translateY(${y}px)`;
  }
}

const OrderRenderer = ({ ref }: Props): VNode[] => {
  const service = new OrdererService();
  ref(service);
  return (
    <div class="draggable-wrapper hidden" ref={e => (service.el = e)}>
      <div class="draggable" ref={el => (service.draggable = el)}>
        <span class="revo-alt-icon" />
        <span ref={e => (service.text = e)} />
      </div>
      <div class="drag-position" ref={e => (service.row = e)} />
    </div>
  );
};
export default OrderRenderer;
