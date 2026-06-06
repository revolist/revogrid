import eq, { notEq } from '../src/plugins/filter/conditions/equal';
import set, { notSet } from '../src/plugins/filter/conditions/set';
import contains, { notContains } from '../src/plugins/filter/conditions/string/contains';
import beginsWith from '../src/plugins/filter/conditions/string/beginswith';
import gtThan from '../src/plugins/filter/conditions/number/greaterThan';
import lt from '../src/plugins/filter/conditions/number/lessThan';
import { FilterPlugin } from '../src/plugins/filter/filter.plugin';
import { getFilterReorderId, moveFilterItem } from '../src/plugins/filter/filter.reorder';
import { DataStore } from '../src/store/dataSource/data.store';
import type { ColumnRegular } from '../src';
import type { FilterData } from '../src/plugins/filter/filter.types';

function createFilterPlugin() {
  const revogrid = Object.assign(new EventTarget(), {
    registerVNode: [],
  }) as unknown as HTMLRevoGridElement;

  return new FilterPlugin(revogrid, {} as any);
}

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

describe('filter reorder helpers', () => {
  function createDataTransfer(payloads: Record<string, string>): DataTransfer {
    return {
      getData: (type: string) => payloads[type] ?? '',
    } as DataTransfer;
  }

  function createFilters(): FilterData[] {
    return [
      { id: 1, type: 'contains', value: 'Admin', relation: 'and' },
      { id: 2, type: 'eq', value: 'Engineer', relation: 'or' },
      { id: 3, type: 'notEq', value: 'Designer', relation: 'and' },
    ];
  }

  describe('getFilterReorderId', () => {
    it('returns no reorder id for empty drag payloads', () => {
      expect(getFilterReorderId(createDataTransfer({}))).toBeUndefined();
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': '   ' }))).toBeUndefined();
    });

    it('parses a finite reorder id from non-empty drag payloads', () => {
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': ' 7 ' }))).toBe(7);
      expect(getFilterReorderId(createDataTransfer({ 'text/revogrid-filter-id': '8', 'text/plain': '7' }))).toBe(8);
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': 'abc' }))).toBeUndefined();
    });

    it('keeps finite parsing explicit for special numeric strings', () => {
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': 'NaN' }))).toBeUndefined();
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': 'Infinity' }))).toBeUndefined();
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': '-Infinity' }))).toBeUndefined();
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': '-3' }))).toBe(-3);
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': '0' }))).toBe(0);
      expect(getFilterReorderId(createDataTransfer({ 'text/plain': ' 0 ' }))).toBe(0);
    });
  });

  describe('moveFilterItem', () => {
    it('moves a filter item before an earlier target and preserves condition data', () => {
      const filters = createFilters();

      expect(moveFilterItem(filters, 3, 1)).toBe(true);

      expect(filters.map(filter => filter.id)).toEqual([3, 1, 2]);
      expect(filters[0]).toMatchObject({
        id: 3,
        type: 'notEq',
        value: 'Designer',
      });
    });

    it('moves a filter item after a later target when dragging downward', () => {
      const filters = createFilters();

      expect(moveFilterItem(filters, 1, 3)).toBe(true);

      expect(filters.map(filter => filter.id)).toEqual([2, 3, 1]);
    });

    it('keeps relation connectors assigned by row position after reorder', () => {
      const filters: FilterData[] = [
        { id: 1, type: 'contains', value: 'Admin', relation: 'or' },
        { id: 2, type: 'contains', value: 'Engineer', relation: 'and' },
      ];

      expect(moveFilterItem(filters, 1, 2)).toBe(true);

      expect(filters).toEqual([
        { id: 2, type: 'contains', value: 'Engineer', relation: 'or' },
        { id: 1, type: 'contains', value: 'Admin', relation: 'and' },
      ]);
    });

    it('defaults missing relation connectors to and after reorder', () => {
      const filters: FilterData[] = [
        { id: 1, type: 'contains', value: 'Admin' },
        { id: 2, type: 'contains', value: 'Engineer', relation: 'or' },
        { id: 3, type: 'contains', value: 'Designer', relation: undefined },
      ];

      expect(moveFilterItem(filters, 3, 1)).toBe(true);

      expect(filters.map(filter => filter.relation)).toEqual(['and', 'or', 'and']);
    });

    it('normalizes the last hidden relation after reorder', () => {
      const filters: FilterData[] = [
        { id: 1, type: 'contains', value: 'Admin', relation: 'and' },
        { id: 2, type: 'contains', value: 'Engineer', relation: 'or' },
        { id: 3, type: 'contains', value: 'Designer', relation: 'or' },
      ];

      expect(moveFilterItem(filters, 3, 1)).toBe(true);

      expect(filters.map(filter => filter.relation)).toEqual(['and', 'or', 'and']);
    });

    it('keeps filter order unchanged when source or target is invalid', () => {
      const filters = createFilters();

      expect(moveFilterItem(filters, 1, 1)).toBe(false);
      expect(moveFilterItem(filters, 99, 1)).toBe(false);
      expect(moveFilterItem(filters, 1, 99)).toBe(false);

      expect(filters.map(filter => filter.id)).toEqual([1, 2, 3]);
    });
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

describe('FilterPlugin.getRowFilter', () => {
  const roleColumn = {
    prop: 'role',
    name: 'Role',
  } as ColumnRegular;
  const columnsByProp = {
    role: roleColumn,
  };
  const adminRows = [
    { name: 'Alice', role: 'Admin' },
    { name: 'Ben', role: 'Engineer' },
    { name: 'Cara', role: 'Admin' },
  ];

  function containsRole(value: string, relation: FilterData['relation'] = 'and', id = 0): FilterData {
    return {
      id,
      type: 'contains',
      value,
      relation,
    };
  }

  function trimByRole(rows: Record<string, string>[], filters: FilterData[]) {
    return createFilterPlugin().getRowFilter(
      rows,
      {
        role: filters,
      },
      columnsByProp,
    );
  }

  it('returns trim indexes for rows that do not match a contains filter', () => {
    const trimmed = trimByRole(adminRows, [containsRole('Admin')]);

    expect(trimmed).toEqual({
      1: true,
    });
  });

  it('recalculates trim indexes against a replaced source', () => {
    const filters = [containsRole('Admin')];
    const firstTrimmed = trimByRole(adminRows, filters);
    const replacedTrimmed = trimByRole(
      [
        { name: 'Eve', role: 'Manager' },
        { name: 'Finn', role: 'Engineer' },
        { name: 'Gia', role: 'Admin' },
      ],
      filters,
    );

    expect(firstTrimmed).toEqual({
      1: true,
    });
    expect(replacedTrimmed).toEqual({
      0: true,
      1: true,
    });
  });

  it('keeps rows that match at least one OR filter', () => {
    const trimmed = trimByRole(
      [
        { name: 'Alice', role: 'Admin' },
        { name: 'Ben', role: 'Engineer' },
        { name: 'Cara', role: 'Manager' },
        { name: 'Dan', role: 'Designer' },
      ],
      [
        containsRole('Admin', 'or'),
        containsRole('Manager', 'or', 1),
      ],
    );

    expect(trimmed).toEqual({
      1: true,
      3: true,
    });
  });

  it('trims rows unless every AND filter is satisfied', () => {
    const trimmed = trimByRole(
      [
        { name: 'Alice', role: 'Senior Admin' },
        { name: 'Ben', role: 'Senior Engineer' },
        { name: 'Cara', role: 'Admin' },
      ],
      [
        containsRole('Senior'),
        containsRole('Admin', 'and', 1),
      ],
    );

    expect(trimmed).toEqual({
      1: true,
      2: true,
    });
  });

  it('applies filter trim maps to the visible row indexes', () => {
    const store = new DataStore('rgRow');
    store.updateData([
      { name: 'Alice', role: 'Admin' },
      { name: 'Ben', role: 'Engineer' },
      { name: 'Cara', role: 'Admin' },
    ]);

    store.addTrimmed({
      filter: {
        1: true,
      },
    });

    expect(store.store.get('proxyItems')).toEqual([0, 1, 2]);
    expect(store.store.get('items')).toEqual([0, 2]);
  });

  it('ignores configured collection filters without a registered filter function', () => {
    const plugin = createFilterPlugin();

    plugin.initConfig({
      collection: {
        role: {
          type: 'contains',
          value: 'Admin',
        },
        name: {
          type: 'missing-filter',
          value: 'Alice',
        },
      },
    });

    expect(plugin.filterCollection).toEqual({
      role: {
        type: 'contains',
        value: 'Admin',
      },
    });
  });
});
