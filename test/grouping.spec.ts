import type { DataType } from '../src';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  PSEUDO_GROUP_ITEM,
} from '../src/plugins/groupingRow/grouping.const';
import { gatherGrouping } from '../src/plugins/groupingRow/grouping.service';
import {
  filterOutEmptyGroupRows,
  filterOutEmptyGroups,
  processDoubleConversionTrimmed,
} from '../src/plugins/groupingRow/grouping.trimmed.service';

function groupRow(name: string, depth: number): DataType {
  return {
    [PSEUDO_GROUP_ITEM]: name,
    [GROUP_DEPTH]: depth,
  };
}

describe('row grouping', () => {
  describe('gatherGrouping', () => {
    it('creates collapsed groups and trims child data rows', () => {
      const { sourceWithGroups, trimmed, depth } = gatherGrouping(
        [
          { name: 'Alice', team: 'North' },
          { name: 'Ben', team: 'North' },
          { name: 'Cara', team: 'South' },
        ],
        ['team'],
        { expandedAll: false },
      );

      expect(depth).toBe(1);
      expect(sourceWithGroups.map(row => row[PSEUDO_GROUP_ITEM] ?? row.name)).toEqual([
        'North',
        'Alice',
        'Ben',
        'South',
        'Cara',
      ]);
      expect(sourceWithGroups[0][GROUP_EXPANDED]).toBe(false);
      expect(sourceWithGroups[3][GROUP_EXPANDED]).toBe(false);
      expect(trimmed).toEqual({
        1: true,
        2: true,
        4: true,
      });
    });
  });

  describe('processDoubleConversionTrimmed', () => {
    it('remaps converted trims and drops unmapped group row indexes', () => {
      const trimmed = processDoubleConversionTrimmed(
        {
          filter: {
            0: true,
            1: true,
            5: true,
          },
          external: {
            2: false,
            3: true,
          },
          grouping: {
            4: true,
          },
        },
        {
          1: 10,
          3: 30,
        },
      );

      expect(trimmed).toEqual({
        filter: {
          10: true,
        },
        external: {
          30: true,
        },
      });
    });
  });

  describe('filterOutEmptyGroupRows', () => {
    it('hides collapsed group rows without matching child data rows', () => {
      const trimmed = filterOutEmptyGroupRows(
        [
          groupRow('North', 0),
          { name: 'Alice' },
          { name: 'Ben' },
          groupRow('South', 0),
          { name: 'Cara' },
        ],
        {
          1: true,
          2: true,
        },
      );

      expect(trimmed).toEqual({
        0: true,
        1: true,
        2: true,
      });
    });

    it('keeps parent groups visible when a nested branch has matching data rows', () => {
      const trimmed = filterOutEmptyGroupRows(
        [
          groupRow('Europe', 0),
          groupRow('North', 1),
          { name: 'Alice' },
          groupRow('South', 1),
          { name: 'Cara' },
        ],
        {
          2: true,
        },
      );

      expect(trimmed).toEqual({
        2: true,
        1: true,
      });
    });
  });

  describe('filterOutEmptyGroups', () => {
    it('hides groups when all mapped children are trimmed', () => {
      const trimmed = filterOutEmptyGroups(
        {
          filter: {
            1: true,
            2: true,
          },
          external: {
            4: true,
          },
        },
        {
          0: [1, 2],
          3: [4, 5],
        },
      );

      expect(trimmed).toEqual({
        0: true,
      });
    });
  });
});
