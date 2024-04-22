import { h, VNode } from '@stencil/core';
import { PositionItem } from '../../types/interfaces';
import { Cell } from '../../types/selection';

type Props = { ref: { (e: OrdererService): void } };

/**
 * Draw drag
 */
export class OrdererService {
  private parentY = 0;
  el!: HTMLElement;
  rgRow!: HTMLElement;
  text!: HTMLElement;
  draggable!: HTMLElement;

  start(parent: HTMLElement, { pos, text, event }: { pos: PositionItem; text: string; event: MouseEvent }) {
    const { top } = parent.getBoundingClientRect();
    this.parentY = top;
    if (this.text) {
      this.text.innerText = text;
    }
    this.move(pos);
    this.moveTip({ x: event.x, y: event.y });
    this.el?.classList.remove('hidden');
  }
  end() {
    this.el?.classList.add('hidden');
  }
  move(pos: PositionItem) {
    this.moveElement(pos.end - this.parentY);
  }
  moveTip({ x, y }: Cell) {
    if (!this.draggable) {
      return;
    }
    this.draggable.style.left = `${x}px`;
    this.draggable.style.top = `${y}px`;
  }

  private moveElement(y: number) {
    if (!this.rgRow) {
      return;
    }
    this.rgRow.style.transform = `translateY(${y}px)`;
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
      <div class="drag-position" ref={e => (service.rgRow = e)} />
    </div>
  );
};
export default OrderRenderer;
