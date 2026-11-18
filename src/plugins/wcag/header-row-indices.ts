import { columnTypes, type Groups } from '@store';
import type { ColumnDataSources } from '../../services/column.data.provider';

export type HeaderRowIndices = {
  groups: Partial<Record<number, number>>;
  leaf: number;
};

/** Keep logical header indices stable as the horizontal viewport moves. */
export function getHeaderRowIndices(
  stores: ColumnDataSources,
): HeaderRowIndices {
  const levels = new Set<number>();
  let hasColumns = false;
  for (const type of columnTypes) {
    const store = stores[type].store;
    const columnCount = store.get('items').length;
    if (!columnCount) {
      continue;
    }
    hasColumns = true;
    const groupsByLevel: Groups = store.get('groups');
    for (const [level, groups] of Object.entries(groupsByLevel)) {
      // A render hook can replace a group's range, including an empty range.
      if (groups.length) {
        levels.add(Number(level));
      }
    }
  }

  return {
    groups: Object.fromEntries(
      [...levels]
        .sort((a, b) => a - b)
        .map((level, index) => [level, index + 1]),
    ),
    leaf: hasColumns ? levels.size + 1 : 0,
  };
}
