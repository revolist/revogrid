import type { ColumnData } from '../../src';
import type { SampleRow } from './types';

export const SAMPLE_ROWS = {
  pair: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
  ] as SampleRow[],
  trio: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
  ] as SampleRow[],
  quartet: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
    { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra' },
  ] as SampleRow[],
} as const;

export const withHeaderTestId = (
  testId: string,
  extra: Record<string, unknown> = {},
) => ({
  __testId: testId,
  ...extra,
});

export function buildColumns(columns: ColumnData): ColumnData {
  return columns.map(column => {
    if (Array.isArray((column as any).children)) {
      return {
        ...column,
        children: buildColumns((column as any).children),
      };
    }
    return { ...column };
  });
}

export function basicColumns(
  props: Array<'id' | 'name' | 'role' | 'city'> = ['id', 'name', 'role', 'city'],
): ColumnData {
  const names = {
    id: 'ID',
    name: 'Name',
    role: 'Role',
    city: 'City',
  } as const;
  return buildColumns(props.map(prop => ({ prop, name: names[prop] })));
}

export function buildRows(
  count: number,
  columns: string[] = ['id', 'name', 'role', 'city'],
) {
  return Array.from({ length: count }, (_, index) => {
    const row: Record<string, unknown> = {
      id: index + 1,
      name: `Name ${index + 1}`,
      role: `Role ${index + 1}`,
      city: `City ${index + 1}`,
      group: index % 2 === 0 ? 'A' : 'B',
      team: index < count / 2 ? 'North' : 'South',
    };
    columns.forEach((column, columnIndex) => {
      if (!(column in row)) {
        row[column] = `R${index + 1}C${columnIndex + 1}`;
      }
    });
    return row;
  });
}
