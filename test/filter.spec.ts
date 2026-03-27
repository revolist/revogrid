import eq, { notEq } from '../src/plugins/filter/conditions/equal';
import set, { notSet } from '../src/plugins/filter/conditions/set';
import contains, { notContains } from '../src/plugins/filter/conditions/string/contains';
import beginsWith from '../src/plugins/filter/conditions/string/beginswith';
import gtThan from '../src/plugins/filter/conditions/number/greaterThan';
import lt from '../src/plugins/filter/conditions/number/lessThan';

// ---------------------------------------------------------------------------
// eq / notEq
// ---------------------------------------------------------------------------
describe('eq (equal)', () => {
  it('eq("Hello", "hello") → true (case-insensitive match)', () => {
    expect(eq('Hello', 'hello')).toBe(true);
    expect(eq('WORLD', 'world')).toBe(true);
  });

  it('eq("Hello", "world") → false (values differ)', () => {
    expect(eq('Hello', 'world')).toBe(false);
  });

  it('eq(undefined, "test") → true (undefined value always passes the filter)', () => {
    expect(eq(undefined, 'test')).toBe(true);
  });

  it('eq("anything", "") → true (empty filter string matches everything)', () => {
    expect(eq('anything', '')).toBe(true);
  });

  it('eq(42, "42") → true, eq(false, "false") → true (non-strings are JSON.stringified before compare)', () => {
    expect(eq(42, '42')).toBe(true);
    expect(eq(false, 'false')).toBe(true);
  });

  it('eq(null, undefined) → true (null with no filter always passes)', () => {
    expect(eq(null, undefined)).toBe(true);
  });
});

describe('notEq', () => {
  it('notEq("Hello", "world") → true, notEq("Hello", "hello") → false (strict inverse of eq)', () => {
    expect(notEq('Hello', 'world')).toBe(true);
    expect(notEq('Hello', 'hello')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// set / notSet
// ---------------------------------------------------------------------------
describe('set (is set)', () => {
  it('set("hello") → true, set(0) → true, set(false) → true (truthy-but-falsy values are considered set)', () => {
    expect(set('hello')).toBe(true);
    expect(set(0)).toBe(true);     // 0 is falsy but IS set
    expect(set(false)).toBe(true); // false is falsy but IS set
  });

  it('set("") → false, set(null) → false, set(undefined) → false (empty/absent values are not set)', () => {
    expect(set('')).toBe(false);
    expect(set(null)).toBe(false);
    expect(set(undefined)).toBe(false);
  });
});

describe('notSet', () => {
  it('notSet("") → true, notSet(null) → true, notSet("hello") → false (strict inverse of set)', () => {
    expect(notSet('')).toBe(true);
    expect(notSet(null)).toBe(true);
    expect(notSet('hello')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contains / notContains
// ---------------------------------------------------------------------------
describe('contains', () => {
  it('contains("Hello World", "WORLD") → true (case-insensitive substring match)', () => {
    expect(contains('Hello World', 'WORLD')).toBe(true);
    expect(contains('foobar', 'oba')).toBe(true);
  });

  it('contains("Hello", "xyz") → false (substring not present)', () => {
    expect(contains('Hello', 'xyz')).toBe(false);
  });

  it('contains("anything", undefined) → true (no filter means everything passes)', () => {
    expect(contains('anything', undefined)).toBe(true);
  });

  it('contains("", "x") → false, contains(null, "x") → false (empty/null value never contains anything)', () => {
    expect(contains('', 'x')).toBe(false);
    expect(contains(null, 'x')).toBe(false);
  });
});

describe('notContains', () => {
  it('notContains("Hello", "xyz") → true, notContains("Hello World", "world") → false (strict inverse of contains)', () => {
    expect(notContains('Hello', 'xyz')).toBe(true);
    expect(notContains('Hello World', 'world')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// beginsWith
// ---------------------------------------------------------------------------
describe('beginsWith', () => {
  it('beginsWith("Hello", "HE") → true (case-insensitive prefix match)', () => {
    expect(beginsWith('Hello', 'HE')).toBe(true);
    expect(beginsWith('foobar', 'foo')).toBe(true);
  });

  it('beginsWith("Hello", "llo") → false ("llo" is a suffix, not a prefix)', () => {
    expect(beginsWith('Hello', 'llo')).toBe(false);
  });

  it('beginsWith("Hello", undefined) → true (no filter means everything passes)', () => {
    expect(beginsWith('Hello', undefined)).toBe(true);
  });

  it('beginsWith("", "he") → false, beginsWith(null, "he") → false (empty/null value has no prefix)', () => {
    expect(beginsWith('', 'he')).toBe(false);
    expect(beginsWith(null, 'he')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// gtThan / lt — numeric comparators
// ---------------------------------------------------------------------------
describe.each([
  ['gtThan', gtThan, 10, 3] as const,
  ['lt',     lt,      3, 10] as const,
])('%s', (name, fn, trueVal, falseVal) => {
  it(`fn(${trueVal}, "5") → true`, () => {
    expect(fn(trueVal, '5')).toBe(true);
  });

  it(`fn(${falseVal}, "5") → false, fn(5, "5") → false (boundary: equal is not strictly ${name === 'gtThan' ? 'greater' : 'less'})`, () => {
    expect(fn(falseVal, '5')).toBe(false);
    expect(fn(5, '5')).toBe(false);
  });

  it('fn("hello", "5") → false, fn(undefined, "5") → false (only works on numeric values)', () => {
    expect(fn('hello', '5')).toBe(false);
    expect(fn(undefined, '5')).toBe(false);
  });
});
