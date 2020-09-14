import {RevoGrid} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';

export type DragEventData = {
  el: HTMLElement;
  rows: RevoGrid.DimensionSettingsState;
};

interface Config {
  positionChanged(from: number, to: number): void;
}

let lastKnownId: number = 0;
export default class RowOrderService {
  private id: string = `${new Date().getTime()}-${lastKnownId++}`;
  private currentRow: number|null = null;

  constructor(private config: Config) {}

  endOrder(e: DragEvent, data: DragEventData): void {
    if (e.dataTransfer.getData('text') === this.id) {
      const newRow = this.getRow(e.clientY, data);
      this.config.positionChanged(this.currentRow, newRow);
    }
  }
  startOrder(e: DragEvent, data: DragEventData): void {
    e.dataTransfer.setData('text', this.id);
    this.currentRow = this.getRow(e.clientY, data);
  }

  private getRow(y: number, {el, rows}: DragEventData): number {
    const {top} = el.getBoundingClientRect();
    const row = getItemByPosition(rows, y - top);
    return row.itemIndex;
  }
}
