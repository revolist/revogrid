import {RevoGrid, Selection} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';


type EventData = {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState};
interface Config { positionChanged(from: number, to: number): void; }

export default class RowOrderService {
  private currentCell: Selection.Cell|null = null;
  private previousRow: number|null = null;

  constructor(private config: Config) {}

  /** Drag finished, calculate and apply changes */
  endOrder(e: MouseEvent, data: EventData): void {
    if (this.currentCell === null) {
      return;
    }
    const newRow = this.getCell(e, data);

    // if position changed
    if (newRow.y !== this.currentCell.y) {

      // row dragged out table
      if (newRow.y < 0) {
        newRow.y = 0;
      }
      // row dragged to the top
      else if (newRow.y < this.currentCell.y) {
        newRow.y++;
      }
      this.config.positionChanged(this.currentCell.y, newRow.y);
    }
    this.clear();
  }

  /** Drag started, reserve initial cell for farther use */
  startOrder(e: MouseEvent, data: EventData): Selection.Cell {
    this.currentCell = this.getCell(e, data);
    return this.currentCell;
  }

  move(y: number, data: EventData): RevoGrid.PositionItem|null {
    const row = this.getRow(y, data);
    // if row same as previous or below range (-1 = 0) do nothing
    if (this.previousRow === row.itemIndex || row.itemIndex < -1) {
      return null;
    }
    this.previousRow = row.itemIndex;
    return row;
  }

  /** Drag stopped, probably cursor outside of document area */
  clear(): void {
    this.currentCell = null;
    this.previousRow = null;
  }

  /** Calculate cell based on x, y position */
  getRow(y: number, {el, rows}: EventData): RevoGrid.PositionItem {
    const {top} = el.getBoundingClientRect();
    const topRelative = y - top;
    const row = getItemByPosition(rows, topRelative);
    const absolutePosition = {
      itemIndex: row.itemIndex,
      start: row.start + top,
      end: row.end + top
    };
    return absolutePosition;
  }

   /** Calculate cell based on x, y position */
   getCell({x, y}: Selection.Cell, {el, rows, cols}: EventData): Selection.Cell {
    const {top, left} = el.getBoundingClientRect();
    const topRelative = y - top;
    const leftRelative = x - left;
    const row = getItemByPosition(rows, topRelative);
    const col = getItemByPosition(cols, leftRelative);
    return { x: col.itemIndex, y: row.itemIndex };
  }
}
