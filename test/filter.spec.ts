import eq, { notEq } from '../src/plugins/filter/conditions/equal';
import set, { notSet } from '../src/plugins/filter/conditions/set';
import contains, { notContains } from '../src/plugins/filter/conditions/string/contains';
import beginsWith from '../src/plugins/filter/conditions/string/beginswith';
import gtThan from '../src/plugins/filter/conditions/number/greaterThan';
import lt from '../src/plugins/filter/conditions/number/lessThan';
import { FilterPlugin } from '../src/plugins/filter/filter.plugin';
import { FilterPanel } from '../src/plugins/filter/filter.panel';
import { ASYNC_FILTER_ROW_THRESHOLD } from '../src/plugins/filter/filter.constants';
import { getFilterReorderId, moveFilterItem } from '../src/plugins/filter/filter.reorder';
import { DataStore } from '../src/store/dataSource/data.store';
import type { ColumnRegular } from '../src';
import {
  filterNames,
  filterTypeDefaults,
  filterTypes,
} from '../src/plugins/filter/filter.indexed';
import type {
  ColumnFilterConfig,
  FilterData,
  FilterEvaluationContext,
  ShowData,
} from '../src/plugins/filter/filter.types';

function createFilterPlugin(config: ColumnFilterConfig = {}) {
  const revogrid = Object.assign(new EventTarget(), {
    registerVNode: [],
  }) as unknown as HTMLRevoGridElement;

  return new FilterPlugin(revogrid, {} as any, config);
}

describe('default filter resolution', () => {
  it('exports and resolves the built-in string and number defaults', () => {
    const plugin = createFilterPlugin();

    expect(filterTypeDefaults).toEqual({
      string: 'contains',
      number: 'eqN',
    });
    expect(plugin.getDefaultFilter(true)).toBe('contains');
    expect(plugin.getDefaultFilter('string')).toBe('contains');
    expect(plugin.getDefaultFilter('number')).toBe('eqN');
  });

  it('uses a valid structured column override', () => {
    const plugin = createFilterPlugin();

    expect(
      plugin.getColumnFilter({ type: ['string', 'number'], default: 'lte' }),
    ).toEqual({
      string: filterTypes.string,
      number: filterTypes.number,
    });
    expect(
      plugin.getDefaultFilter({ type: ['string', 'number'], default: 'lte' }),
    ).toBe('lte');
  });

  it('falls back from invalid or excluded defaults', () => {
    const plugin = createFilterPlugin({ include: ['empty', 'notEq', 'lte'] });

    expect(
      plugin.getDefaultFilter({ type: 'string', default: 'missing' }),
    ).toBe('empty');
    expect(
      plugin.getDefaultFilter({ type: 'number', default: 'eqN' }),
    ).toBe('empty');
  });

  it('uses the first operator from the first custom family without a default', () => {
    const plugin = createFilterPlugin({
      customFilters: {
        selected: {
          columnFilterType: 'selection',
          name: 'Selected',
          func: () => true,
        },
        notSelected: {
          columnFilterType: 'selection',
          name: 'Not selected',
          func: () => true,
        },
      },
    });

    expect(plugin.getDefaultFilter('selection')).toBe('selected');
    expect(plugin.getDefaultFilter(['selection', 'number'])).toBe('selected');
    expect(
      plugin.getDefaultFilter({
        type: ['selection', 'number'],
        default: 'eqN',
      }),
    ).toBe('eqN');
  });

  it('supports grid and column-level default draft opt-outs', () => {
    const enabledPlugin = createFilterPlugin();
    const disabledPlugin = createFilterPlugin({ defaultFilter: false });

    expect(enabledPlugin.shouldShowDefaultFilter('string')).toBe(true);
    expect(
      enabledPlugin.shouldShowDefaultFilter({ type: 'string', default: false }),
    ).toBe(false);
    expect(disabledPlugin.shouldShowDefaultFilter('string')).toBe(false);
    expect(
      disabledPlugin.shouldShowDefaultFilter({ type: 'string', default: 'eq' }),
    ).toBe(true);
  });

  it('does not seed a hidden draft for panels owned by another plugin', async () => {
    const panel = new FilterPanel();

    await panel.show({
      prop: 'name',
      x: 0,
      y: 0,
      filterTypes: { string: ['contains'] },
      hideDefaultFilters: true,
    } as ShowData);

    expect(panel.draftFilter).toBeUndefined();
  });
});

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

describe('configurable blank semantics', () => {
  const column = { prop: 'value', filter: 'string' } as ColumnRegular;
  const columnsByProp = { value: column };

  function blankTrimmed(
    rows: Record<string, any>[],
    type: 'empty' | 'notEmpty' = 'empty',
    config: ColumnFilterConfig = {},
    targetColumn: ColumnRegular = column,
  ) {
    return createFilterPlugin(config).getRowFilter(
      rows,
      { value: [{ id: 1, type, relation: 'and' }] },
      { value: targetColumn },
    );
  }

  it('applies the default source-value matrix without normalizing identities', () => {
    const rows = [
      { value: null },
      { value: undefined },
      { value: '' },
      { value: '   ' },
      { value: false },
      { value: 0 },
      { value: Number.NaN },
      { value: [] },
      { value: ['item'] },
      { value: {} },
      {},
    ];

    expect(blankTrimmed(rows)).toEqual({
      3: true,
      4: true,
      5: true,
      6: true,
      7: true,
      8: true,
      9: true,
    });
    expect(blankTrimmed(rows, 'notEmpty')).toEqual({
      0: true,
      1: true,
      2: true,
      10: true,
    });
  });

  it('merges a partial column policy field-by-field over the grid policy', () => {
    const configuredColumn = {
      ...column,
      blankSemantics: { emptyArray: false, whitespaceOnlyString: true },
    } as ColumnRegular;
    const rows = [{ value: [] }, { value: '  ' }, { value: null }];

    expect(blankTrimmed(
      rows,
      'empty',
      { blankSemantics: { emptyArray: true, null: false } },
      configuredColumn,
    )).toEqual({ 0: true, 2: true });
  });

  it('uses the final predicate override and keeps not-blank as its exact inverse', () => {
    const seen: [any, boolean][] = [];
    const config: ColumnFilterConfig = {
      blankSemantics: {
        isBlank: (value, _context, fallback) => {
          seen.push([value, fallback]);
          return value === 0 ? true : fallback;
        },
      },
    };
    const rows = [{ value: 0 }, { value: false }, { value: null }];

    expect(blankTrimmed(rows, 'empty', config)).toEqual({ 1: true });
    expect(blankTrimmed(rows, 'notEmpty', config)).toEqual({ 0: true, 2: true });
    expect(seen).toContainEqual([0, false]);
  });

  it('treats inherited properties as missing instead of as present values', () => {
    const inherited = Object.create({ value: 'inherited' });
    const config = { blankSemantics: { missingProperty: false } };

    expect(blankTrimmed([inherited])).toEqual({});
    expect(blankTrimmed([inherited], 'empty', config)).toEqual({ 0: true });
  });

  it('preserves the source value before cellParser while ordinary filters use the parsed value', () => {
    const contexts: FilterEvaluationContext[] = [];
    const parsedColumn = {
      prop: 'value',
      filter: 'string',
      cellParser: () => 'parsed',
    } as ColumnRegular;
    const plugin = createFilterPlugin({
      customFilters: {
        capturesContext: {
          columnFilterType: 'string',
          name: 'Captures context',
          func: (value, _extra, context) => {
            contexts.push(context!);
            return value === 'parsed';
          },
        },
      },
    });
    const rows = [{ value: false }];

    expect(plugin.getRowFilter(
      rows,
      { value: [{ id: 1, type: 'empty', relation: 'and' }] },
      { value: parsedColumn },
    )).toEqual({ 0: true });
    expect(plugin.getRowFilter(
      rows,
      { value: [{ id: 1, type: 'capturesContext', relation: 'and' }] },
      { value: parsedColumn },
    )).toEqual({});
    expect(contexts[0]).toMatchObject({
      model: rows[0],
      column: parsedColumn,
      property: 'value',
      sourceValue: false,
      parsedValue: 'parsed',
      hasOwnProperty: true,
    });
  });

  it('keeps nullish and missing source identity when a parser returns a nonblank value', () => {
    const seen: Array<{ value: any; hasOwnProperty: boolean }> = [];
    const parsedColumn = {
      prop: 'value',
      filter: 'string',
      cellParser: () => 'parsed',
    } as ColumnRegular;
    const rows = [{ value: null }, { value: undefined }, {}];

    expect(blankTrimmed(rows, 'empty', {
      blankSemantics: {
        isBlank: (value, context, fallback) => {
          seen.push({ value, hasOwnProperty: context.hasOwnProperty });
          return fallback;
        },
      },
    }, parsedColumn)).toEqual({});
    expect(seen).toEqual([
      { value: null, hasOwnProperty: true },
      { value: undefined, hasOwnProperty: true },
      { value: undefined, hasOwnProperty: false },
    ]);
  });

  it('delivers evaluation context to built-in blank callbacks', () => {
    let context: FilterEvaluationContext | undefined;
    blankTrimmed([{ value: null }], 'empty', {
      blankSemantics: {
        isBlank: (_value, evaluationContext, fallback) => {
          context = evaluationContext;
          return fallback;
        },
      },
    });

    expect(context).toMatchObject({
      property: 'value',
      sourceValue: null,
      parsedValue: null,
      hasOwnProperty: true,
    });
  });

  it('keeps saved operator IDs and registers blank filters for typed families', () => {
    expect(filterNames.empty).toBe('Is blank');
    expect(filterNames.notEmpty).toBe('Is not blank');
    expect(filterTypes.boolean).toEqual(['notEmpty', 'empty']);
    expect(filterTypes.array).toEqual(['notEmpty', 'empty']);
    expect(blankTrimmed([{ value: null }], 'empty')).toEqual({});
    expect(blankTrimmed([{ value: null }], 'notEmpty')).toEqual({ 0: true });
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

  afterEach(() => {
    jest.useRealTimers();
  });

  function createRunnableGrid() {
    return {
      registerVNode: [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(() => true),
    } as unknown as HTMLRevoGridElement;
  }

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

  it('resolves each column and parses each row once for multiple filters', () => {
    const rows = [
      { name: 'Alice', role: 'Senior Admin' },
      { name: 'Ben', role: 'Senior Engineer' },
    ];
    const cellParser = jest.fn((model: Record<string, string>) => model.role);
    const getBlankSemantics = jest.fn(() => ({ whitespaceOnlyString: true }));
    const column = {
      ...roleColumn,
      cellParser,
      get blankSemantics() {
        return getBlankSemantics();
      },
    } as ColumnRegular;

    const trimmed = createFilterPlugin().getRowFilter(
      rows,
      {
        role: [
          containsRole('Senior'),
          containsRole('Admin', 'and', 1),
        ],
      },
      { role: column },
    );

    expect(trimmed).toEqual({ 1: true });
    expect(getBlankSemantics).toHaveBeenCalledTimes(1);
    expect(cellParser.mock.calls).toEqual([
      [rows[0], column],
      [rows[1], column],
    ]);
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

  it('keeps large filter runs pending until their trim is ready', async () => {
    jest.useFakeTimers();
    const lastRowIndex = ASYNC_FILTER_ROW_THRESHOLD - 1;
    const rows = Array.from(
      { length: ASYNC_FILTER_ROW_THRESHOLD },
      (_, index) => ({
        name: `Row ${index}`,
        role: index === lastRowIndex ? 'Admin' : 'Engineer',
      }),
    );
    const store = new DataStore('rgRow');
    store.updateData(rows);
    const providers = {
      data: {
        stores: { rgRow: store },
        setItemsPending: (pending: boolean) => store.setItemsPending(pending),
        setTrimmed: (trimmed: any) => store.addTrimmed(trimmed),
      },
      column: {
        getColumns: () => [roleColumn],
        updateColumns: jest.fn(),
      },
    } as any;
    const plugin = new FilterPlugin(createRunnableGrid(), providers);

    plugin.multiFilterItems = {
      role: [{ id: 0, type: 'eq', value: 'Admin', relation: 'and' }],
    };
    const filtering = plugin.runFiltering(plugin.multiFilterItems);

    expect(store.store.get('items')).toEqual([]);
    await jest.runAllTimersAsync();
    await filtering;

    expect(store.store.get('items')).toEqual([lastRowIndex]);
  });

  it('runs subclass completion hooks after asynchronous filtering', async () => {
    jest.useFakeTimers();
    const lastRowIndex = ASYNC_FILTER_ROW_THRESHOLD - 1;
    const rows = Array.from(
      { length: ASYNC_FILTER_ROW_THRESHOLD },
      (_, index) => ({
        role: index === lastRowIndex ? 'Admin' : 'Engineer',
      }),
    );
    const store = new DataStore('rgRow');
    store.updateData(rows);
    const providers = {
      data: {
        stores: { rgRow: store },
        setItemsPending: (pending: boolean) => store.setItemsPending(pending),
        setTrimmed: (trimmed: any) => store.addTrimmed(trimmed),
      },
      column: {
        getColumns: () => [roleColumn],
        updateColumns: jest.fn(),
      },
    } as any;
    class CompletionFilterPlugin extends FilterPlugin {
      completedRuns = 0;

      async doFiltering(...args: Parameters<FilterPlugin['doFiltering']>) {
        await super.doFiltering(...args);
        this.completedRuns++;
      }
    }
    const plugin = new CompletionFilterPlugin(createRunnableGrid(), providers);
    plugin.multiFilterItems = {
      role: [{ id: 0, type: 'eq', value: 'Admin', relation: 'and' }],
    };

    const filtering = plugin.runFiltering(plugin.multiFilterItems);
    await jest.runAllTimersAsync();
    await filtering;

    expect(plugin.completedRuns).toBe(1);
    expect(store.store.get('items')).toEqual([lastRowIndex]);
  });

  it('releases staged rows when filtering is prevented', async () => {
    const rows = [{ role: 'Admin' }, { role: 'Engineer' }];
    const store = new DataStore('rgRow');
    store.updateData(rows);
    store.setItemsPending(true);
    const grid = {
      registerVNode: [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn((event: Event) => {
        if (event.type === 'beforefilterapply') {
          event.preventDefault();
        }
        return !event.defaultPrevented;
      }),
    } as unknown as HTMLRevoGridElement;
    const providers = {
      data: {
        stores: { rgRow: store },
        setItemsPending: (pending: boolean) => store.setItemsPending(pending),
        setTrimmed: (trimmed: any) => store.addTrimmed(trimmed),
      },
      column: {
        getColumns: () => [roleColumn],
        updateColumns: jest.fn(),
      },
    } as any;
    const plugin = new FilterPlugin(grid, providers);
    plugin.multiFilterItems = {
      role: [{ id: 0, type: 'eq', value: 'Admin', relation: 'and' }],
    };

    await plugin.runFiltering(plugin.multiFilterItems);

    expect(store.store.get('items')).toEqual([0, 1]);
  });

  it('discards stale large filter work when a newer run starts', async () => {
    jest.useFakeTimers();
    const rows = Array.from(
      { length: ASYNC_FILTER_ROW_THRESHOLD },
      (_, index) => ({
        role: index % 2 ? 'Admin' : 'Engineer',
      }),
    );
    const store = new DataStore('rgRow');
    store.updateData(rows);
    const setTrimmed = jest.fn((trimmed: any) => store.addTrimmed(trimmed));
    const providers = {
      data: {
        stores: { rgRow: store },
        setItemsPending: (pending: boolean) => store.setItemsPending(pending),
        setTrimmed,
      },
      column: {
        getColumns: () => [roleColumn],
        updateColumns: jest.fn(),
      },
    } as any;
    const plugin = new FilterPlugin(createRunnableGrid(), providers);

    plugin.multiFilterItems = {
      role: [{ id: 0, type: 'eq', value: 'Admin', relation: 'and' }],
    };
    const staleRun = plugin.runFiltering(plugin.multiFilterItems);
    plugin.multiFilterItems = {
      role: [{ id: 1, type: 'eq', value: 'Engineer', relation: 'and' }],
    };
    const currentRun = plugin.runFiltering(plugin.multiFilterItems);

    await jest.runAllTimersAsync();
    await Promise.all([staleRun, currentRun]);

    expect(setTrimmed).toHaveBeenCalledTimes(1);
    expect(store.store.get('items')).toEqual(
      Array.from(
        { length: ASYNC_FILTER_ROW_THRESHOLD / 2 },
        (_, index) => index * 2,
      ),
    );
  });

  it('preserves whole-source semantics for getRowFilter overrides', async () => {
    jest.useFakeTimers();
    const lastRowIndex = ASYNC_FILTER_ROW_THRESHOLD - 1;
    const rows = Array.from(
      { length: ASYNC_FILTER_ROW_THRESHOLD },
      (_, index) => ({
        role: index === lastRowIndex ? 'Admin' : 'Engineer',
      }),
    );
    const store = new DataStore('rgRow');
    store.updateData(rows);
    const providers = {
      data: {
        stores: { rgRow: store },
        setItemsPending: (pending: boolean) => store.setItemsPending(pending),
        setTrimmed: (trimmed: any) => store.addTrimmed(trimmed),
      },
      column: {
        getColumns: () => [roleColumn],
        updateColumns: jest.fn(),
      },
    } as any;
    class WholeSourceFilterPlugin extends FilterPlugin {
      evaluatedSourceLengths: number[] = [];

      getRowFilter(...args: Parameters<FilterPlugin['getRowFilter']>) {
        this.evaluatedSourceLengths.push(args[0].length);
        return super.getRowFilter(...args);
      }
    }
    const plugin = new WholeSourceFilterPlugin(createRunnableGrid(), providers);
    plugin.multiFilterItems = {
      role: [{ id: 0, type: 'eq', value: 'Admin', relation: 'and' }],
    };

    const filtering = plugin.runFiltering(plugin.multiFilterItems);
    await jest.runAllTimersAsync();
    await filtering;

    expect(plugin.evaluatedSourceLengths).toEqual([ASYNC_FILTER_ROW_THRESHOLD]);
    expect(store.store.get('items')).toEqual([lastRowIndex]);
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
