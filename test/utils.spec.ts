import { generateHeader, generateHeaderByCount } from '../src/utils/header.utils';
import { calculateRowHeaderSize } from '../src/utils/row-header-utils';
import { range, findPositionInArray, pushSorted, mergeSortedArray } from '../src/utils';

// ---------------------------------------------------------------------------
// generateHeader
// ---------------------------------------------------------------------------
describe('generateHeader', () => {
  it('index 0 → "A", index 1 → "B", index 25 → "Z" (single-letter range)', () => {
    expect(generateHeader(0)).toBe('A');
    expect(generateHeader(1)).toBe('B');
    expect(generateHeader(25)).toBe('Z');
  });

  it('index 26 → "AA", 27 → "AB", 51 → "AZ", 52 → "BA" (two-letter range)', () => {
    expect(generateHeader(26)).toBe('AA');
    expect(generateHeader(27)).toBe('AB');
    expect(generateHeader(51)).toBe('AZ');
    expect(generateHeader(52)).toBe('BA');
  });

  it('index 701 → "ZZ" (last two-letter), index 702 → "AAA" (first three-letter)', () => {
    expect(generateHeader(701)).toBe('ZZ');
    expect(generateHeader(702)).toBe('AAA');
  });
});

describe('generateHeaderByCount', () => {
  it('count 0 → [] (empty array)', () => {
    expect(generateHeaderByCount(0)).toEqual([]);
  });

  it('count 3 → ["A", "B", "C"]', () => {
    expect(generateHeaderByCount(3)).toEqual(['A', 'B', 'C']);
  });

  it('count 27 → 27 headers where last element [26] is "AA"', () => {
    expect(generateHeaderByCount(27)).toHaveLength(27);
    expect(generateHeaderByCount(27)[26]).toBe('AA');
  });
});

// ---------------------------------------------------------------------------
// calculateRowHeaderSize
// ---------------------------------------------------------------------------
describe('calculateRowHeaderSize', () => {
  it('itemsLength=5 (1 digit) → (1+1)*10=20 < minWidth 50 → returns 50', () => {
    expect(calculateRowHeaderSize(5)).toBe(50);
  });

  it('itemsLength=100 (3 digits) → (3+1)*10=40 < minWidth 50 → returns 50', () => {
    expect(calculateRowHeaderSize(100)).toBe(50);
  });

  it('itemsLength=100000 (6 digits) → (6+1)*10=70 > minWidth 50 → returns 70', () => {
    expect(calculateRowHeaderSize(100000)).toBe(70);
  });

  it('rowHeaderColumn.size=80 overrides digit-based calculation → returns 80', () => {
    expect(calculateRowHeaderSize(5, { size: 80 })).toBe(80);
  });

  it('custom minWidth=30: itemsLength=5 → (1+1)*10=20 < 30 → returns 30', () => {
    expect(calculateRowHeaderSize(5, undefined, 30)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// range
// ---------------------------------------------------------------------------
describe('range', () => {
  it('range(5) → [0, 1, 2, 3, 4] (zero-based)', () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('range(3, 10) → [10, 11, 12] (custom start)', () => {
    expect(range(3, 10)).toEqual([10, 11, 12]);
  });

  it('range(0) → [] (empty when size is 0)', () => {
    expect(range(0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findPositionInArray (binary search — bound to `this` array)
// ---------------------------------------------------------------------------
describe('findPositionInArray', () => {
  const numCompare = (a: number, b: number) => a - b;
  const arr = [1, 3, 5, 7, 9];

  it('[1,3,5,7,9]: searching 5 → returns index 2 (found)', () => {
    expect(findPositionInArray.call(arr, 5, numCompare)).toBe(2);
  });

  it('[1,3,5,7,9]: searching 4 (missing) → returns negative, insertion point is index 2', () => {
    const idx = findPositionInArray.call(arr, 4, numCompare);
    expect(idx).toBeLessThan(0);
    expect(-idx - 1).toBe(2); // insertion point encoded as -insertionPoint - 1
  });

  it('empty array: searching 5 → returns negative, insertion point is 0', () => {
    const idx = findPositionInArray.call([], 5, numCompare);
    expect(idx).toBeLessThan(0);
    expect(-idx - 1).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// pushSorted
// ---------------------------------------------------------------------------
describe('pushSorted', () => {
  const numCompare = (a: number, b: number) => a - b;

  it('[] + insert 5 → [5]', () => {
    const arr: number[] = [];
    pushSorted(arr, 5, numCompare);
    expect(arr).toEqual([5]);
  });

  it('[1,3,5] + insert duplicate 3 → array length grows to 4 with two 3s', () => {
    const arr = [1, 3, 5];
    pushSorted(arr, 3, numCompare);
    expect(arr.filter(v => v === 3)).toHaveLength(2);
    expect(arr).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// mergeSortedArray
// ---------------------------------------------------------------------------
describe('mergeSortedArray', () => {
  it('[1,3,5] + [2,4,6] → [1,2,3,4,5,6] (interleaved merge, default comparator)', () => {
    expect(mergeSortedArray([1, 3, 5], [2, 4, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('[] + [1,2,3] → [1,2,3] (empty left array)', () => {
    expect(mergeSortedArray([], [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('[1,2,3] + [] → [1,2,3] (empty right array)', () => {
    expect(mergeSortedArray([1, 2, 3], [])).toEqual([1, 2, 3]);
  });

  it('[] + [] → [] (both empty)', () => {
    expect(mergeSortedArray([], [])).toEqual([]);
  });

  it('[{v:1},{v:3}] + [{v:2},{v:4}] with custom comparator → values [1,2,3,4]', () => {
    const result = mergeSortedArray(
      [{ v: 1 }, { v: 3 }],
      [{ v: 2 }, { v: 4 }],
      (a, b) => a.v < b.v,
    );
    expect(result.map(r => r.v)).toEqual([1, 2, 3, 4]);
  });
});
