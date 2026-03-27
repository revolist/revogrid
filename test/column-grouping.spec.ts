import { getColumns, type ColumnData } from '../src';

describe('column grouping', () => {
  it('rebases nested group indexes for later sibling branches', () => {
    const columns: ColumnData = [
      {
        name: 'Parent',
        children: [
          {
            name: 'Child A',
            children: [
              {
                name: 'Leaf A',
                children: [
                  { prop: 'a1' },
                  { prop: 'a2' },
                ],
              },
            ],
          },
          {
            name: 'Child B',
            children: [
              {
                name: 'Leaf B',
                children: [
                  { prop: 'b1' },
                  { prop: 'b2' },
                ],
              },
            ],
          },
        ],
      },
    ];

    const collection = getColumns(columns);
    const groupIndexes = collection.columnGrouping.rgCol.reduce<Record<string, number[]>>(
      (result, group) => {
        result[String(group.name)] = group.indexes;
        return result;
      },
      {},
    );

    expect(groupIndexes.Parent).toEqual([0, 1, 2, 3]);
    expect(groupIndexes['Child A']).toEqual([0, 1]);
    expect(groupIndexes['Leaf A']).toEqual([0, 1]);
    expect(groupIndexes['Child B']).toEqual([2, 3]);
    expect(groupIndexes['Leaf B']).toEqual([2, 3]);
  });
});
