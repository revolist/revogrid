import {
  generateFakeDataObject,
  generateFakeDataObjectAsync,
} from '../src/serve/data';

describe('serve demo data generation', () => {
  it('keeps the synchronous generator output shape unchanged', () => {
    const data = generateFakeDataObject({
      rows: 4,
      cols: 3,
      topPinned: [0],
      bottomPinned: [3],
    });

    expect(data.headers).toHaveLength(3);
    expect(data.rows).toHaveLength(2);
    expect(data.pinnedTopRows).toHaveLength(1);
    expect(data.pinnedBottomRows).toHaveLength(1);
    expect(data.rows[0][0]).toBe('1:0');
    expect(data.rows[1][2]).toBe('2:2');
  });

  it('reports async generation progress while chunking rows', async () => {
    const progress: Array<{ rows: number; totalRows: number }> = [];

    const data = await generateFakeDataObjectAsync(
      {
        rows: 5,
        cols: 2,
      },
      {
        maxCellsPerChunk: 4,
        onProgress: event => progress.push(event),
      },
    );

    expect(data?.rows).toHaveLength(5);
    expect(progress).toEqual([
      { rows: 2, totalRows: 5 },
      { rows: 4, totalRows: 5 },
      { rows: 5, totalRows: 5 },
    ]);
  });

  it('does not duplicate final progress when rows end on a chunk boundary', async () => {
    const progress: Array<{ rows: number; totalRows: number }> = [];

    const data = await generateFakeDataObjectAsync(
      {
        rows: 4,
        cols: 2,
      },
      {
        maxCellsPerChunk: 4,
        onProgress: event => progress.push(event),
      },
    );

    expect(data?.rows).toHaveLength(4);
    expect(progress).toEqual([
      { rows: 2, totalRows: 4 },
      { rows: 4, totalRows: 4 },
    ]);
  });

  it('reports final progress for an empty async dataset', async () => {
    const progress: Array<{ rows: number; totalRows: number }> = [];

    const data = await generateFakeDataObjectAsync(
      {
        rows: 0,
        cols: 2,
      },
      {
        maxCellsPerChunk: 4,
        onProgress: event => progress.push(event),
      },
    );

    expect(data?.rows).toHaveLength(0);
    expect(progress).toEqual([{ rows: 0, totalRows: 0 }]);
  });

  it('reports final progress when rows do not end on a chunk boundary', async () => {
    const progress: Array<{ rows: number; totalRows: number }> = [];

    const data = await generateFakeDataObjectAsync(
      {
        rows: 5,
        cols: 2,
      },
      {
        maxCellsPerChunk: 4,
        onProgress: event => progress.push(event),
      },
    );

    expect(data?.rows).toHaveLength(5);
    expect(progress.at(-1)).toEqual({ rows: 5, totalRows: 5 });
  });

  it('cancels stale async generation before returning data', async () => {
    const progress: Array<{ rows: number; totalRows: number }> = [];
    let canceled = false;

    const data = await generateFakeDataObjectAsync(
      {
        rows: 6,
        cols: 1,
      },
      {
        maxCellsPerChunk: 2,
        isCanceled: () => canceled,
        onProgress: event => {
          progress.push(event);
          canceled = true;
        },
      },
    );

    expect(data).toBeNull();
    expect(progress).toEqual([{ rows: 2, totalRows: 6 }]);
  });
});
