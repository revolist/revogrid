import { getItemByPosition } from '@store';
import { DimensionSettingsState, PositionItem, Cell } from '@type';

type EventData = { el: HTMLElement; rows: DimensionSettingsState; cols: DimensionSettingsState };
interface Config {
  positionChanged(from: number, to: number): void;
}

export default class RowOrderService {
  private currentCell: Cell | null = null;
  private previousRow: number | null = null;

  constructor(private config: Config) {}

  /** Drag finished, calculate and apply changes */
  endOrder(e: MouseEvent, data: EventData) {
    if (this.currentCell === null) {
      return;
    }
    const newRow = this.getCell(e, data);

    // if position changed
    if (newRow.y !== this.currentCell.y) {
      // rgRow dragged out table
      if (newRow.y < 0) {
        newRow.y = 0;
      }
      // rgRow dragged to the top
      else if (newRow.y < this.currentCell.y) {
        newRow.y++;
      }
      this.config.positionChanged(this.currentCell.y, newRow.y);
    }
    this.clear();
  }

  /** Drag started, reserve initial cell for farther use */
  startOrder(e: MouseEvent, data: EventData): Cell {
    this.currentCell = this.getCell(e, data);
    return this.currentCell;
  }

  move(y: number, data: EventData): PositionItem | null {
    const rgRow = this.getRow(y, data);
    // if rgRow same as previous or below range (-1 = 0) do nothing
    if (this.previousRow === rgRow.itemIndex || rgRow.itemIndex < -1) {
      return null;
    }
    this.previousRow = rgRow.itemIndex;
    return rgRow;
  }

  /** Drag stopped, probably cursor outside of document area */
  clear() {
    this.currentCell = null;
    this.previousRow = null;
  }

  /** Calculate cell based on x, y position */
  getRow(y: number, { el, rows }: EventData): PositionItem {
    const { top } = el.getBoundingClientRect();
    const topRelative = y - top;
    const rgRow = getItemByPosition(rows, topRelative);
    const absolutePosition = {
      itemIndex: rgRow.itemIndex,
      start: rgRow.start + top,
      end: rgRow.end + top,
    };
    return absolutePosition;
  }

  /** Calculate cell based on x, y position */
  getCell({ x, y }: Cell, { el, rows, cols }: EventData): Cell {
    const { top, left } = el.getBoundingClientRect();
    const topRelative = y - top;
    const leftRelative = x - left;
    const rgRow = getItemByPosition(rows, topRelative);
    const rgCol = getItemByPosition(cols, leftRelative);
    return { x: rgCol.itemIndex, y: rgRow.itemIndex };
  }
}
