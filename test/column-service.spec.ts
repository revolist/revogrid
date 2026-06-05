import ColumnService from '../src/components/data/column.service';
import { DataStore } from '../src/store/dataSource/data.store';
import type { ColumnRegular, DataType } from '../src';

function createColumnService(
  rows: DataType[],
  columns: ColumnRegular[],
): ColumnService {
  const rowStore = new DataStore('rgRow');
  rowStore.updateData(rows);

  const columnStore = new DataStore('rgCol');
  columnStore.updateData(columns);

  return new ColumnService(rowStore.store, columnStore.store);
}

describe('ColumnService clipboard paste transform', () => {
  it('applies pasted data from the focused cell by default', () => {
    const service = createColumnService(
      [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Ben', role: 'Designer' },
      ],
      [
        { prop: 'name' },
        { prop: 'role' },
      ],
    );

    const result = service.getTransformedDataToApply({
      start: { x: 0, y: 0 },
      data: [['Alpha']],
    });

    expect(result).toEqual({
      changed: {
        0: { name: 'Alpha' },
      },
      range: { x: 0, y: 0, x1: 0, y1: 0 },
    });
  });

  it('fills the provided target range from a single clipboard cell', () => {
    const service = createColumnService(
      [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Ben', role: 'Designer' },
      ],
      [
        { prop: 'name' },
        { prop: 'role' },
      ],
    );

    const result = service.getTransformedDataToApply({
      start: { x: 0, y: 0 },
      data: [['Alpha']],
      targetRange: { x: 0, y: 0, x1: 1, y1: 1 },
    });

    expect(result).toEqual({
      changed: {
        0: { name: 'Alpha', role: 'Alpha' },
        1: { name: 'Alpha', role: 'Alpha' },
      },
      range: { x: 0, y: 0, x1: 1, y1: 1 },
    });
  });

  it('skips readonly cells inside the target range', () => {
    const service = createColumnService(
      [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Ben', role: 'Designer' },
      ],
      [
        { prop: 'name' },
        { prop: 'role', readonly: true },
      ],
    );

    const result = service.getTransformedDataToApply({
      start: { x: 0, y: 0 },
      data: [['Alpha']],
      targetRange: { x: 0, y: 0, x1: 1, y1: 1 },
    });

    expect(result).toEqual({
      changed: {
        0: { name: 'Alpha' },
        1: { name: 'Alpha' },
      },
      range: { x: 0, y: 0, x1: 1, y1: 1 },
    });
  });

  it('returns an empty result for empty clipboard data', () => {
    const service = createColumnService(
      [{ name: 'Alice' }],
      [{ prop: 'name' }],
    );

    const result = service.getTransformedDataToApply({
      start: { x: 0, y: 0 },
      data: [],
      targetRange: { x: 0, y: 0, x1: 0, y1: 0 },
    });

    expect(result).toEqual({
      changed: {},
      range: null,
    });
  });
});
