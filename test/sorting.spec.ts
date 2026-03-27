import {
  getNextOrder,
  defaultCellCompare,
  descCellCompare,
  sortIndexByItems,
  getComparer,
} from '../src/plugins/sorting/sorting.func';

// ---------------------------------------------------------------------------
// getNextOrder — cycles undefined → 'asc' → 'desc' → undefined
// ---------------------------------------------------------------------------
describe('getNextOrder', () => {
  it('undefined → "asc" (first click starts ascending sort)', () => {
    expect(getNextOrder(undefined)).toBe('asc');
  });

  it('"asc" → "desc" (second click flips to descending)', () => {
    expect(getNextOrder('asc')).toBe('desc');
  });

  it('"desc" → undefined (third click clears sort)', () => {
    expect(getNextOrder('desc')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// defaultCellCompare — case-insensitive comparator, bound with {column}
// ---------------------------------------------------------------------------
describe('defaultCellCompare', () => {
  const cmp = defaultCellCompare.bind({ column: undefined });

  it('"Alice" vs "Bob" → negative (a comes before b alphabetically)', () => {
    expect(cmp('name', { name: 'Alice' }, { name: 'Bob' })).toBeLessThan(0);
  });

  it('"Z" vs "A" → positive (a comes after b alphabetically)', () => {
    expect(cmp('name', { name: 'Z' }, { name: 'A' })).toBeGreaterThan(0);
  });

  it('"Same" vs "same" → 0 (case-insensitive equality)', () => {
    expect(cmp('name', { name: 'Same' }, { name: 'same' })).toBe(0);
  });

  it('25 vs 30 → negative, 100 vs 9 → positive (numeric comparison, not lexicographic)', () => {
    expect(cmp('age', { age: 25 }, { age: 30 })).toBeLessThan(0);
    expect(cmp('age', { age: 100 }, { age: 9 })).toBeGreaterThan(0);
  });

  it('undefined vs "Alice" → negative (missing prop sorts before any string value)', () => {
    const result = cmp('name', {}, { name: 'Alice' });
    expect(result).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// descCellCompare — reverses any comparator
// ---------------------------------------------------------------------------
describe('descCellCompare', () => {
  const ascCmp = defaultCellCompare.bind({ column: undefined });
  const descCmp = descCellCompare(ascCmp);

  it('"Alice" vs "Bob": asc returns negative → desc returns positive (order inverted)', () => {
    expect(descCmp('name', { name: 'Alice' }, { name: 'Bob' })).toBeGreaterThan(0);
  });

  it('"Z" vs "A": asc returns positive → desc returns negative (order inverted)', () => {
    expect(descCmp('name', { name: 'Z' }, { name: 'A' })).toBeLessThan(0);
  });

  it('"Same" vs "same" → 0 (-1 * 0 === -0 in JS, both satisfy == 0)', () => {
    expect(descCmp('name', { name: 'Same' }, { name: 'same' }) == 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sortIndexByItems
// ---------------------------------------------------------------------------
describe('sortIndexByItems', () => {
  const source = [
    { name: 'Charlie', age: 30 }, // physical index 0
    { name: 'Alice',   age: 25 }, // physical index 1
    { name: 'Bob',     age: 35 }, // physical index 2
  ];
  const strCmp = (prop: string, a: any, b: any): number => {
    const av = a[prop]?.toString().toLowerCase();
    const bv = b[prop]?.toString().toLowerCase();
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  };

  it('empty sortingFunc {} → [0,1,2] (indexes unchanged, no sorting applied)', () => {
    expect(sortIndexByItems([0, 1, 2], source, {})).toEqual([0, 1, 2]);
  });

  it('sort by name asc → [1,2,0] (Alice→1, Bob→2, Charlie→0)', () => {
    const result = sortIndexByItems([0, 1, 2], source, { name: strCmp });
    expect(result).toEqual([1, 2, 0]);
  });

  it('omitting sortingFunc defaults to empty → [0,1,2] (no sorting)', () => {
    expect(sortIndexByItems([0, 1, 2], source)).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// getComparer
// ---------------------------------------------------------------------------
describe('getComparer', () => {
  it('order=undefined → returns undefined (no comparator, no sorting)', () => {
    expect(getComparer(undefined, undefined)).toBeUndefined();
  });

  it('order="asc" → returns function where "Alice" vs "Bob" gives negative (Alice first)', () => {
    const cmp = getComparer(undefined, 'asc');
    expect(typeof cmp).toBe('function');
    expect(cmp!('name', { name: 'Alice' }, { name: 'Bob' })).toBeLessThan(0);
  });

  it('order="desc" → returns function where "Alice" vs "Bob" gives positive (Bob first)', () => {
    const cmp = getComparer(undefined, 'desc');
    expect(typeof cmp).toBe('function');
    expect(cmp!('name', { name: 'Alice' }, { name: 'Bob' })).toBeGreaterThan(0);
  });
});
