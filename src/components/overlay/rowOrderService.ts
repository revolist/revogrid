import {RevoGrid, Selection} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';


type EventData = {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState};
interface Config { positionChanged(from: number, to: number): void; }

export default class RowOrderService {
  private currentCell: Selection.Cell|null = null;

  get current(): Selection.Cell {
    return this.currentCell;
  }

  constructor(private config: Config) {}

  /** Drag finished, calculate and apply changes */
  endOrder(e: MouseEvent, data: EventData): void {
    if (this.currentCell === null) {
      return;
    }
    const newRow = this.getCurrentCell(e, data);

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
    this.currentCell = null;
  }

  /** Drag started, reserve initial cell for farther use */
  startOrder(e: MouseEvent, data: EventData): void {
    this.currentCell = this.getCurrentCell(e, data);
  }

  /** Drag stopped, probably cursor outside of document area */
  clear(): void {
    this.currentCell = null;
  }

  /** Calculate cell based on x, y position */
  getCurrentRow(y: number, {el, rows}: EventData): RevoGrid.PositionItem {
    const {top} = el.getBoundingClientRect();
    const row = getItemByPosition(rows, y - top);
    return row;
  }

   /** Calculate cell based on x, y position */
   getCurrentCell({x, y}: Selection.Cell, {el, rows, cols}: EventData): Selection.Cell {
    const {top, left} = el.getBoundingClientRect();
    const row = getItemByPosition(rows, y - top);
    const col = getItemByPosition(cols, x - left);
    return { x: col.itemIndex, y: row.itemIndex };
  }
}
