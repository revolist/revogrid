import type { Action } from './sequence';

export type Row = {
  id: number;
  name: string;
  team: 'North' | 'South';
  status: 'Keep' | 'Drop';
};

export const pinnedRow: Row = { id: -1, name: 'Pinned', team: 'North', status: 'Keep' };
export const defaultSize = { width: 520, height: 360 };
export const largeRowCount = 15000;

export function makeRows(generation = 0, count = 32): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: generation * 100000 + index,
    name: `row-${generation}-${index}`,
    team: index < count / 2 ? 'North' : 'South',
    status: index % 2 ? 'Keep' : 'Drop',
  }));
}

export class GridModel {
  rows = makeRows();
  order?: 'asc' | 'desc';
  trimmedId?: number;
  grouped = false;
  northCollapsed = false;
  filtered = false;
  selected = false;
  pin?: 'colPinStart' | 'colPinEnd';
  focus?: number;

  visible(): Row[] {
    const visible = this.rows.filter(row =>
      row.id !== this.trimmedId &&
      (!this.northCollapsed || row.team !== 'North') &&
      (!this.filtered || row.status === 'Keep')
    );
    return this.order === 'desc' ? visible.reverse() : visible;
  }

  apply(action: Exclude<Action, { kind: 'mount' }>) {
    switch (action.kind) {
      case 'sort':
        this.order = action.order;
        break;
      case 'trim':
        this.trimmedId = action.index === null ? undefined : this.rows[action.index]?.id;
        break;
      case 'edit':
        if (!action.cancel) this.visible()[action.row].name = action.value;
        break;
      case 'replaceDuringEdit':
        this.rows = makeRows(action.generation);
        break;
      case 'select':
        this.selected = true;
        break;
      case 'paste':
        if (!this.selected) throw new Error('Paste requires a selection');
        this.visible().slice(0, 2).forEach((row, index) => { row.name = action.values[index]; });
        break;
      case 'churn':
        this.rows = makeRows(action.generation, largeRowCount);
        this.filtered = true;
        this.order = action.order;
        break;
      case 'group':
        this.grouped = true;
        break;
      case 'toggleNorth':
        this.northCollapsed = !this.northCollapsed;
        break;
      case 'focus':
        this.focus = action.row;
        break;
      case 'pin':
        this.pin = action.side;
        break;
      case 'key':
        if (this.focus === undefined) throw new Error('Navigation requires focus');
        this.focus++;
        break;
    }
  }

  trimIndex(index: number) {
    if (!this.grouped) return index;
    // This fixture has two contiguous teams and one synthetic header per team.
    return index + (this.rows[index].team === 'North' ? 1 : 2);
  }
}
