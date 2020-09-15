import {RevoGrid, Selection} from '../../interfaces';
import {getItemByPosition} from '../../store/dimension/dimension.helpers';


type EventData = {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState};

interface Config {
  positionChanged(from: number, to: number): void;
}

export default class RowOrderService {
  private currentCell: Selection.Cell|null = null;

  get current(): Selection.Cell {
    return this.currentCell;
  }

  constructor(private config: Config) {}

  endOrder(e: MouseEvent, data: EventData): void {
    if (this.currentCell === null) {
      return;
    }
    const newRow = this.getCurrentCell(e, data);
    this.config.positionChanged(this.currentCell.y, newRow.y);
    this.currentCell = null;
  }
  startOrder(e: MouseEvent, data: EventData): void {
    this.currentCell = this.getCurrentCell(e, data);
  }
  clear(): void {
    this.currentCell = null;
  }
   /** Calculate cell based on x, y position */
   private getCurrentCell({x, y}: Selection.Cell, {el, rows, cols}: EventData): Selection.Cell {
    const {top, left} = el.getBoundingClientRect();
    const row = getItemByPosition(rows, y - top);
    const col = getItemByPosition(cols, x - left);
    return { x: col.itemIndex, y: row.itemIndex };
  }
}
