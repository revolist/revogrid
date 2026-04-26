import type { DataType } from '../src';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  PSEUDO_GROUP_ITEM_ID,
  PSEUDO_GROUP_ITEM,
  PSEUDO_GROUP_ITEM_VALUE,
} from '../src/plugins/groupingRow/grouping.const';
import { doCollapse, doExpand } from '../src/plugins/groupingRow/grouping.row.expand.service';
import {
  gatherGrouping,
  getSource,
  isGrouping,
  measureEqualDepth,
} from '../src/plugins/groupingRow/grouping.service';
import {
  filterOutEmptyGroupRows,
  filterOutEmptyGroups,
  processDoubleConversionTrimmed,
  TRIMMED_GROUPING,
} from '../src/plugins/groupingRow/grouping.trimmed.service';

function groupRow(name: string, depth: number, expanded = false, path: string[] = [name]): DataType {
  return {
    [PSEUDO_GROUP_ITEM]: name,
    [GROUP_DEPTH]: depth,
    [GROUP_EXPANDED]: expanded,
    [PSEUDO_GROUP_ITEM_ID]: JSON.stringify(path),
    [PSEUDO_GROUP_ITEM_VALUE]: path.join(','),
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

    it('creates nested expanded groups with original-to-grouped row indexes', () => {
      const { sourceWithGroups, trimmed, oldNewIndexMap, depth } = gatherGrouping(
        [
          { name: 'Alice', region: 'Europe', team: 'North' },
          { name: 'Ben', region: 'Europe', team: 'North' },
          { name: 'Cara', region: 'Europe', team: 'South' },
          { name: 'Dan', region: 'Asia', team: 'East' },
        ],
        ['region', 'team'],
        { expandedAll: true },
      );

      expect(depth).toBe(2);
      expect(sourceWithGroups.map(row => row[PSEUDO_GROUP_ITEM] ?? row.name)).toEqual([
        'Europe',
        'North',
        'Alice',
        'Ben',
        'South',
        'Cara',
        'Asia',
        'East',
        'Dan',
      ]);
      expect(sourceWithGroups.map(row => row[GROUP_DEPTH]).filter(depth => typeof depth === 'number')).toEqual([
        0,
        1,
        1,
        0,
        1,
      ]);
      expect(sourceWithGroups[1][PSEUDO_GROUP_ITEM_VALUE]).toBe('Europe,North');
      expect(sourceWithGroups[7][PSEUDO_GROUP_ITEM_ID]).toBe(JSON.stringify(['Asia', 'East']));
      expect(trimmed).toEqual({});
      expect(oldNewIndexMap).toEqual({
        0: 2,
        1: 3,
        2: 5,
        3: 8,
      });
    });

    it('uses previous expanded paths when regrouping', () => {
      const { sourceWithGroups, trimmed } = gatherGrouping(
        [
          { name: 'Alice', region: 'Europe', team: 'North' },
          { name: 'Ben', region: 'Europe', team: 'South' },
          { name: 'Cara', region: 'Asia', team: 'East' },
        ],
        ['region', 'team'],
        {
          expandedAll: false,
          prevExpanded: {
            Europe: true,
            'Europe,North': true,
          },
        },
      );

      expect(sourceWithGroups.map(row => row[PSEUDO_GROUP_ITEM] ?? row.name)).toEqual([
        'Europe',
        'North',
        'Alice',
        'South',
        'Ben',
        'Asia',
        'East',
        'Cara',
      ]);
      expect(sourceWithGroups[0][GROUP_EXPANDED]).toBe(true);
      expect(sourceWithGroups[1][GROUP_EXPANDED]).toBe(true);
      expect(sourceWithGroups[3][GROUP_EXPANDED]).toBe(false);
      expect(sourceWithGroups[5][GROUP_EXPANDED]).toBe(false);
      expect(trimmed).toEqual({
        4: true,
        6: true,
        7: true,
      });
    });
  });

  describe('getSource', () => {
    it('removes group rows and preserves expanded paths with physical-to-data indexes', () => {
      const source = [
        groupRow('North', 0, true),
        { name: 'Alice' },
        { name: 'Ben' },
        groupRow('South', 0, false),
        { name: 'Cara' },
      ];

      const result = getSource(source, [0, 1, 2, 3, 4], true);

      expect(result.source).toEqual([
        { name: 'Alice' },
        { name: 'Ben' },
        { name: 'Cara' },
      ]);
      expect(result.prevExpanded).toEqual({
        North: true,
      });
      expect(result.oldNewIndexes).toEqual({
        1: 0,
        2: 1,
        4: 2,
      });
    });

    it('keeps proxy item order when grouping is not stripped', () => {
      const source = [
        groupRow('North', 0, true),
        { name: 'Alice' },
        { name: 'Ben' },
      ];

      const result = getSource(source, [2, 0], false);

      expect(result.source).toEqual([
        { name: 'Ben' },
        source[0],
      ]);
      expect(result.prevExpanded).toEqual({});
      expect(result.oldNewIndexes).toEqual({});
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
          [TRIMMED_GROUPING]: {
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

    it('applies two-level conversion when rows are ungrouped and regrouped', () => {
      const trimmed = processDoubleConversionTrimmed(
        {
          filter: {
            2: true,
            5: true,
            6: true,
            7: true,
          },
        },
        {
          2: 0,
          5: 2,
          7: 3,
        },
        {
          0: 1,
          2: 4,
        },
      );

      expect(trimmed).toEqual({
        filter: {
          1: true,
          4: true,
        },
      });
    });

    it('uses the second map directly and clears stale trim types when the first map has no match', () => {
      const trimmed = processDoubleConversionTrimmed(
        {
          filter: {
            0: true,
            1: true,
            2: true,
            4: true,
          },
          external: {
            0: true,
          },
        },
        {},
        {
          1: 0,
          2: 1,
          4: 2,
        },
      );

      expect(trimmed).toEqual({
        filter: {
          0: true,
          1: true,
          2: true,
        },
        external: {},
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

    it('removes stale group-row trims when a group has a visible child again', () => {
      const trimmed = filterOutEmptyGroupRows(
        [
          groupRow('North', 0),
          { name: 'Alice' },
          groupRow('South', 0),
          { name: 'Cara' },
        ],
        {
          0: true,
          1: true,
          2: true,
        },
      );

      expect(trimmed).toEqual({
        0: true,
        1: true,
      });
    });

    it('keeps malformed group rows hidden when group depth is missing', () => {
      const trimmed = filterOutEmptyGroupRows(
        [
          {
            [PSEUDO_GROUP_ITEM]: 'North',
          },
          { name: 'Alice' },
        ],
        {
          0: true,
        },
      );

      expect(trimmed).toEqual({
        0: true,
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

    it('keeps groups visible when each group has at least one untrimmed child', () => {
      const trimmed = filterOutEmptyGroups(
        {
          filter: {
            1: true,
            4: true,
          },
          external: {
            2: false,
            5: false,
          },
        },
        {
          0: [1, 2],
          3: [4, 5],
        },
      );

      expect(trimmed).toEqual({});
    });

    it('keeps a group visible when a child is explicitly untrimmed in another trim map', () => {
      const trimmed = filterOutEmptyGroups(
        {
          filter: {
            1: true,
          },
          external: {
            1: false,
            2: false,
          },
        },
        {
          0: [1, 2],
        },
      );

      expect(trimmed).toEqual({});
    });
  });

  describe('expand and collapse helpers', () => {
    it('collapses only the selected group branch and marks descendants trimmed', () => {
      const { sourceWithGroups } = gatherGrouping(
        [
          { name: 'Alice', region: 'Europe', team: 'North' },
          { name: 'Ben', region: 'Europe', team: 'North' },
          { name: 'Cara', region: 'Europe', team: 'South' },
          { name: 'Dan', region: 'Asia', team: 'East' },
        ],
        ['region', 'team'],
        { expandedAll: true },
      );

      const { trimmed } = doCollapse(0, sourceWithGroups);

      expect(trimmed).toEqual({
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
      });
      expect(sourceWithGroups[0][GROUP_EXPANDED]).toBe(false);
      expect(sourceWithGroups[1][GROUP_EXPANDED]).toBe(false);
      expect(sourceWithGroups[4][GROUP_EXPANDED]).toBe(false);
      expect(sourceWithGroups[6][GROUP_EXPANDED]).toBe(true);
    });

    it('expands a collapsed nested branch and inserts visible row indexes after the group', () => {
      const { sourceWithGroups } = gatherGrouping(
        [
          { name: 'Alice', region: 'Europe', team: 'North' },
          { name: 'Ben', region: 'Europe', team: 'North' },
          { name: 'Cara', region: 'Europe', team: 'South' },
        ],
        ['region', 'team'],
        {
          expandedAll: false,
          prevExpanded: {
            Europe: true,
          },
        },
      );

      const { trimmed, items } = doExpand(1, sourceWithGroups, [0, 1, 4]);

      expect(trimmed).toEqual({
        2: false,
        3: false,
      });
      expect(items).toEqual([0, 1, 2, 3, 4]);
      expect(sourceWithGroups[1][GROUP_EXPANDED]).toBe(true);
    });
  });

  describe('grouping type helpers', () => {
    it('detects grouping rows and equal group depth', () => {
      expect(isGrouping(groupRow('North', 0))).toBe(true);
      expect(isGrouping({ name: 'Alice' })).toBe(false);
      expect(measureEqualDepth(['Europe', 'North'], ['Europe', 'South'])).toBe(1);
      expect(measureEqualDepth(['Europe', 'North'], ['Europe', 'North', 'A'])).toBe(2);
    });
  });
});
