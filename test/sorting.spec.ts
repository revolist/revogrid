import {
  getNextOrder,
  defaultCellCompare,
  descCellCompare,
  getSortingIndex,
  hasActiveSorting,
  sortIndexByItems,
  getComparer,
} from '../src/plugins/sorting/sorting.func';
import { SortingPlugin } from '../src/plugins/sorting/sorting.plugin';
import { SortingSign } from '../src/plugins/sorting/sorting.sign';
import {
  GROUP_COLUMN_PROP,
  GROUP_DEPTH,
  GROUP_EXPANDED,
  PSEUDO_GROUP_ITEM,
  PSEUDO_GROUP_ITEM_VALUE,
} from '../src/plugins/groupingRow/grouping.const';

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

  it('"Alice" vs undefined → positive (missing prop comparison is symmetric)', () => {
    const result = cmp('name', { name: 'Alice' }, {});
    expect(result).toBeGreaterThan(0);
  });

  it('treats undefined, null, and empty string as the same empty group', () => {
    expect(cmp('name', {}, { name: null })).toBe(0);
    expect(cmp('name', { name: '' }, {})).toBe(0);
    expect(cmp('name', { name: null }, { name: '' })).toBe(0);
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

  it('empty sortingFunc resets non-sequential indexes to source order', () => {
    expect(sortIndexByItems([2, 0, 1], source, {})).toEqual([0, 1, 2]);
  });

  it('undefined comparator is treated as no active sorting', () => {
    expect(sortIndexByItems([2, 0, 1], source, { name: undefined })).toEqual([2, 0, 1]);
  });

  it('sort by name asc → [1,2,0] (Alice→1, Bob→2, Charlie→0)', () => {
    const result = sortIndexByItems([0, 1, 2], source, { name: strCmp });
    expect(result).toEqual([1, 2, 0]);
  });

  it('uses default column metadata path without changing sort result', () => {
    const cmp = getComparer({ prop: 'name' }, 'asc');
    const result = sortIndexByItems(
      [0, 1, 2],
      source,
      { name: cmp },
      { name: 'asc' },
      { name: { prop: 'name' } },
    );

    expect(result).toEqual([1, 2, 0]);
  });

  it('precomputes default parsed values once per sorted row', () => {
    const parsedSource = [
      { name: 'Charlie' },
      { name: 'Alice' },
      { name: 'Bob' },
    ];
    const cellParser = jest.fn((row: any) => row.name);
    const column = { prop: 'name', cellParser } as any;
    const cmp = getComparer(column, 'asc');

    const result = sortIndexByItems(
      [0, 1, 2],
      parsedSource,
      { name: cmp },
      { name: 'asc' },
      { name: column },
    );

    expect(result).toEqual([1, 2, 0]);
    expect(cellParser).toHaveBeenCalledTimes(parsedSource.length);
  });

  it('groups empty values first in ascending default sorting', () => {
    const emptySource = [
      { name: 'Charlie' },
      {},
      { name: 'Alice' },
      { name: '' },
      { name: null },
      { name: 'Bob' },
    ];
    const result = sortIndexByItems(
      [0, 1, 2, 3, 4, 5],
      emptySource,
      { name: getComparer({ prop: 'name' }, 'asc') },
      { name: 'asc' },
      { name: { prop: 'name' } },
    );

    expect(result).toEqual([1, 3, 4, 2, 5, 0]);
  });

  it('groups empty values last in descending default sorting', () => {
    const emptySource = [
      { name: 'Charlie' },
      {},
      { name: 'Alice' },
      { name: '' },
      { name: null },
      { name: 'Bob' },
    ];
    const result = sortIndexByItems(
      [0, 1, 2, 3, 4, 5],
      emptySource,
      { name: getComparer({ prop: 'name' }, 'desc') },
      { name: 'desc' },
      { name: { prop: 'name' } },
    );

    expect(result).toEqual([0, 5, 2, 1, 3, 4]);
  });

  it('sorts by multiple columns in entry order', () => {
    const multiSource = [
      { team: 'Core', priority: 2, name: 'B' },
      { team: 'Core', priority: 1, name: 'A' },
      { team: 'Docs', priority: 1, name: 'C' },
      { team: 'Core', priority: 1, name: 'D' },
    ];

    const result = sortIndexByItems(
      [0, 1, 2, 3],
      multiSource,
      {
        team: getComparer({ prop: 'team' }, 'asc'),
        priority: getComparer({ prop: 'priority' }, 'desc'),
        name: getComparer({ prop: 'name' }, 'asc'),
      },
      {
        team: 'asc',
        priority: 'desc',
        name: 'asc',
      },
      {
        team: { prop: 'team' },
        priority: { prop: 'priority' },
        name: { prop: 'name' },
      },
    );

    expect(result).toEqual([0, 1, 3, 2]);
  });

  it('uses explicit sorting order for numeric column props', () => {
    const numericSource = [
      { 0: 'Bob', 1: 1 },
      { 0: 'Amy', 1: 2 },
      { 0: 'Zed', 1: 2 },
    ];

    const result = sortIndexByItems(
      [0, 1, 2],
      numericSource,
      {
        1: getComparer({ prop: 1 }, 'desc'),
        0: getComparer({ prop: 0 }, 'asc'),
      },
      {
        1: 'desc',
        0: 'asc',
      },
      {
        1: { prop: 1 },
        0: { prop: 0 },
      },
      [1, 0],
    );

    expect(result).toEqual([1, 2, 0]);
  });

  it('keeps numeric column prop priority before the default comparer fast path', () => {
    const numericSource = [
      { 0: 'A', 1: 2 },
      { 0: 'B', 1: 1 },
      { 0: 'C', 1: 2 },
    ];

    const result = sortIndexByItems(
      [0, 1, 2],
      numericSource,
      {
        1: getComparer({ prop: 1 }, 'desc'),
        0: getComparer({ prop: 0 }, 'desc'),
      },
      {
        1: 'desc',
        0: 'desc',
      },
      {
        1: { prop: 1 },
        0: { prop: 0 },
      },
      [1, 0],
    );

    expect(result).toEqual([2, 0, 1]);
  });

  it('keeps grouped rows on the legacy comparator path for default sorting', () => {
    const groupedSource = [
      {
        [PSEUDO_GROUP_ITEM]: 'group-b',
        [GROUP_EXPANDED]: true,
        [PSEUDO_GROUP_ITEM_VALUE]: 'group-b',
        [GROUP_DEPTH]: 0,
        [GROUP_COLUMN_PROP]: 'group',
        name: 'Group B',
      },
      { name: 'Alice' },
      { name: 'Bob' },
      {
        [PSEUDO_GROUP_ITEM]: 'group-a',
        [GROUP_EXPANDED]: true,
        [PSEUDO_GROUP_ITEM_VALUE]: 'group-a',
        [GROUP_DEPTH]: 0,
        [GROUP_COLUMN_PROP]: 'group',
        name: 'Group A',
      },
      { name: 'Aaron' },
    ];
    const cmp = getComparer({ prop: 'name' }, 'asc');
    const result = sortIndexByItems(
      [0, 1, 2, 3, 4],
      groupedSource,
      { name: cmp },
      { name: 'asc' },
      { name: { prop: 'name' } },
    );

    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it('omitting sortingFunc defaults to empty → [0,1,2] (no sorting)', () => {
    expect(sortIndexByItems([0, 1, 2], source)).toEqual([0, 1, 2]);
  });
});

describe('hasActiveSorting', () => {
  it('treats undefined and empty sorting as inactive', () => {
    expect(hasActiveSorting(undefined)).toBe(false);
    expect(hasActiveSorting({})).toBe(false);
  });

  it('treats undefined order as inactive', () => {
    expect(hasActiveSorting({ name: undefined })).toBe(false);
  });

  it('treats asc and desc orders as active', () => {
    expect(hasActiveSorting({ name: 'asc' })).toBe(true);
    expect(hasActiveSorting({ name: 'desc' })).toBe(true);
  });
});

describe('getSortingIndex', () => {
  it('does not return a visible rank for single-column sorting', () => {
    expect(getSortingIndex({ name: 'asc' }, 'name')).toBeUndefined();
  });

  it('returns one-based rank for additive sorting', () => {
    const sorting = {
      team: 'asc',
      priority: 'desc',
      name: 'asc',
    } as const;

    expect(getSortingIndex(sorting, 'team')).toBe(1);
    expect(getSortingIndex(sorting, 'priority')).toBe(2);
    expect(getSortingIndex(sorting, 'name')).toBe(3);
  });

  it('uses explicit sorting order for numeric column prop ranks', () => {
    const sorting = {
      1: 'asc',
      0: 'asc',
    } as const;

    expect(getSortingIndex(sorting, 1, [1, 0])).toBe(1);
    expect(getSortingIndex(sorting, 0, [1, 0])).toBe(2);
  });

  it('ignores inactive sorting entries when ranking additive sorting', () => {
    expect(getSortingIndex({
      team: 'asc',
      priority: undefined,
      name: 'desc',
    }, 'name')).toBe(2);
  });
});

describe('SortingSign', () => {
  it('renders only direction for single-column sorting', () => {
    const vnode = SortingSign({
      column: { prop: 'name', order: 'asc' },
    } as any);

    expect(vnode.$tag$).toBe('span');
    expect(vnode.$attrs$.class).toBe('sort-indicator');
    expect(vnode.$children$[0].$tag$).toBe('i');
    expect(vnode.$children$[0].$attrs$.class).toBe('asc');
    expect(vnode.$children$).toHaveLength(1);
  });

  it('renders additive sorting rank near direction icon', () => {
    const vnode = SortingSign({
      column: { prop: 'name', order: 'desc', sortIndex: 2 },
    } as any);

    expect(vnode.$children$[0].$attrs$.class).toBe('desc');
    expect(vnode.$children$[1].$tag$).toBe('sup');
    expect(vnode.$children$[1].$attrs$.class).toBe('sort-order-index');
    expect(vnode.$children$[1].$children$[0].$text$).toBe('2');
  });
});

describe('SortingPlugin regressions', () => {
  function createStore(
    source: any[],
    proxyItems = source.map((_, index) => index),
    items = proxyItems,
  ) {
    const state = {
      source,
      proxyItems,
      items: [...items],
    };
    const setData = jest.fn((input: any) => {
      const oldItems = new Set(state.items);
      Object.assign(state, input);
      if (input.proxyItems) {
        state.items = input.proxyItems.filter((index: number) => oldItems.has(index));
      }
    });
    return {
      store: {
        get: (key: keyof typeof state) => state[key],
      },
      setData,
      state,
    };
  }

  function createPlugin(source = [{ name: 'B' }, { name: 'A' }]) {
    const revogrid = Object.assign(document.createElement('revo-grid'), {
      jobsBeforeRender: [],
    }) as unknown as HTMLRevoGridElement;
    const rowStore = createStore(source);
    const providers = {
      data: {
        stores: {
          rgRow: rowStore,
          rowPinStart: createStore([]),
          rowPinEnd: createStore([]),
        },
      },
      dimension: {
        updateSizesPositionByNewDataIndexes: jest.fn(),
      },
      column: {
        getColumns: () => [{ prop: 'name' }],
        dataSources: {
          rgCol: { refresh: jest.fn() },
          colPinStart: { refresh: jest.fn() },
          colPinEnd: { refresh: jest.fn() },
        },
      },
    };

    return {
      plugin: new SortingPlugin(revogrid, providers as any),
      providers,
      revogrid,
      rowStore,
    };
  }

  it('does not emit source sorting apply when sorting is inactive', () => {
    const { revogrid } = createPlugin();
    const beforeSourceSorting = jest.fn();
    revogrid.addEventListener('beforesourcesortingapply', beforeSourceSorting);

    revogrid.dispatchEvent(new CustomEvent('beforeanysource', {
      detail: { type: 'rgRow', source: [] },
    }));

    expect(beforeSourceSorting).not.toHaveBeenCalled();
  });

  it('keeps source sorting apply event when sorting is active', () => {
    const { plugin, revogrid } = createPlugin();
    const beforeSourceSorting = jest.fn();
    plugin.startSorting = jest.fn();
    plugin.sorting = { name: 'asc' };
    plugin.sortingFunc = { name: getComparer({ prop: 'name' }, 'asc') };
    (plugin as any).sortingColumns = { name: { prop: 'name' } };
    (plugin as any).sortingOrder = ['name'];
    revogrid.addEventListener('beforesourcesortingapply', beforeSourceSorting);

    revogrid.dispatchEvent(new CustomEvent('beforeanysource', {
      detail: { type: 'rgRow', source: [] },
    }));

    expect(beforeSourceSorting).toHaveBeenCalledTimes(1);
    expect(plugin.startSorting).toHaveBeenCalledWith(
      plugin.sorting,
      plugin.sortingFunc,
      (plugin as any).sortingColumns,
      (plugin as any).sortingOrder,
    );
  });

  it('clears sorting state without leaving an active empty sort', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.startSorting = jest.fn();

    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: { columns: [{ prop: 'name', order: 'asc' }] },
    }));
    expect(plugin.sorting).toEqual({ name: 'asc' });

    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: { columns: [] },
    }));

    expect(plugin.sorting).toBeUndefined();
    expect(plugin.sortingFunc).toBeUndefined();
    expect((plugin as any).sortingColumns).toBeUndefined();
    expect((plugin as any).sortingOrder).toBeUndefined();
  });

  it('removes one additive sorting column while keeping the remaining active sort', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.startSorting = jest.fn();

    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        additive: true,
        columns: [
          { prop: 'name', order: 'asc' },
          { prop: 'age', order: 'desc' },
        ],
      },
    }));
    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        additive: true,
        columns: [{ prop: 'age', order: undefined }],
      },
    }));

    expect(plugin.sorting).toEqual({ name: 'asc' });
    expect(Object.keys(plugin.sortingFunc || {})).toEqual(['name']);
    expect(Object.keys((plugin as any).sortingColumns || {})).toEqual(['name']);
    expect((plugin as any).sortingOrder).toEqual(['name']);
  });

  it('applies additive multi-column sorting order', () => {
    const source = [
      { team: 'Core', priority: 2, name: 'B' },
      { team: 'Core', priority: 1, name: 'A' },
      { team: 'Docs', priority: 1, name: 'C' },
      { team: 'Core', priority: 1, name: 'D' },
    ];
    const { plugin, revogrid, rowStore } = createPlugin(source);
    plugin.startSorting = jest.fn();

    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        columns: [{ prop: 'team', order: 'asc' }],
      },
    }));
    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        additive: true,
        columns: [
          { prop: 'priority', order: 'desc' },
          { prop: 'name', order: 'asc' },
        ],
      },
    }));

    expect(plugin.sorting).toEqual({
      team: 'asc',
      priority: 'desc',
      name: 'asc',
    });
    expect((plugin as any).sortingOrder).toEqual(['team', 'priority', 'name']);

    plugin.sort(
      plugin.sorting,
      plugin.sortingFunc,
      (plugin as any).sortingColumns,
      (plugin as any).sortingOrder,
      ['rgRow'],
    );

    expect(rowStore.setData).toHaveBeenCalledWith({ proxyItems: [0, 1, 3, 2] });
  });

  it('adds additive sort rank metadata to sortable header data', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.sorting = {
      team: 'asc',
      priority: 'desc',
      name: 'asc',
    };
    (plugin as any).sortingOrder = ['team', 'priority', 'name'];
    const event = new CustomEvent('beforeheaderrender', {
      detail: {
        data: {
          prop: 'priority',
          sortable: true,
        },
      },
    });

    revogrid.dispatchEvent(event);

    expect(event.detail.data).toEqual({
      prop: 'priority',
      sortable: true,
      order: 'desc',
      sortIndex: 2,
    });
  });

  it('adds additive sort rank metadata in click order for numeric column props', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.sorting = {
      1: 'asc',
      0: 'asc',
    };
    (plugin as any).sortingOrder = [1, 0];
    const priorityEvent = new CustomEvent('beforeheaderrender', {
      detail: {
        data: {
          prop: 1,
          sortable: true,
        },
      },
    });
    const nameEvent = new CustomEvent('beforeheaderrender', {
      detail: {
        data: {
          prop: 0,
          sortable: true,
        },
      },
    });

    revogrid.dispatchEvent(priorityEvent);
    revogrid.dispatchEvent(nameEvent);

    expect(priorityEvent.detail.data.sortIndex).toBe(1);
    expect(nameEvent.detail.data.sortIndex).toBe(2);
  });

  it('keeps additive click order for numeric column props', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.startSorting = jest.fn();

    revogrid.dispatchEvent(new CustomEvent('beforeheaderclick', {
      detail: {
        column: { prop: 1, sortable: true },
        originalEvent: { shiftKey: false },
      },
    }));
    revogrid.dispatchEvent(new CustomEvent('beforeheaderclick', {
      detail: {
        column: { prop: 0, sortable: true },
        originalEvent: { shiftKey: true },
      },
    }));

    expect(plugin.sorting).toEqual({
      0: 'asc',
      1: 'asc',
    });
    expect((plugin as any).sortingOrder).toEqual([1, 0]);
  });

  it('keeps additive config order for numeric column props', () => {
    const { plugin, revogrid } = createPlugin();
    plugin.startSorting = jest.fn();

    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        columns: [{ prop: 1, order: 'asc' }],
      },
    }));
    revogrid.dispatchEvent(new CustomEvent('sortingconfigchanged', {
      detail: {
        additive: true,
        columns: [{ prop: 0, order: 'asc' }],
      },
    }));

    expect(plugin.sorting).toEqual({
      0: 'asc',
      1: 'asc',
    });
    expect((plugin as any).sortingOrder).toEqual([1, 0]);
  });

  it('updates proxy order without cloning source during active sort', () => {
    const source = [{ name: 'B' }, { name: 'A' }];
    const { plugin, rowStore } = createPlugin(source);

    plugin.sort(
      { name: 'asc' },
      { name: getComparer({ prop: 'name' }, 'asc') },
      { name: { prop: 'name' } },
      ['name'],
      ['rgRow'],
    );

    expect(rowStore.setData).toHaveBeenCalledWith({ proxyItems: [1, 0] });
    expect(rowStore.state.source).toBe(source);
  });

  it('sorts data indexes when the current source contains grouping rows', () => {
    const source = [
      {
        [PSEUDO_GROUP_ITEM]: 'group-b',
        [GROUP_EXPANDED]: true,
        [PSEUDO_GROUP_ITEM_VALUE]: 'group-b',
        [GROUP_DEPTH]: 0,
        [GROUP_COLUMN_PROP]: 'group',
      },
      { name: 'Alice' },
      { name: 'Bob' },
      {
        [PSEUDO_GROUP_ITEM]: 'group-a',
        [GROUP_EXPANDED]: true,
        [PSEUDO_GROUP_ITEM_VALUE]: 'group-a',
        [GROUP_DEPTH]: 0,
        [GROUP_COLUMN_PROP]: 'group',
      },
      { name: 'Aaron' },
    ];
    const { plugin, rowStore } = createPlugin(source);

    plugin.sort(
      { name: 'asc' },
      { name: getComparer({ prop: 'name' }, 'asc') },
      { name: { prop: 'name' } },
      ['name'],
      ['rgRow'],
    );

    expect(rowStore.setData).toHaveBeenCalledWith({ proxyItems: [0, 4, 1, 3, 2] });
  });

  it('sorts full proxy order while preserving filtered visible items', () => {
    const source = [
      { name: 'Zed', role: 'Admin' },
      { name: 'Amy', role: 'User' },
      { name: 'Bob', role: 'Admin' },
      { name: 'Max', role: 'User' },
    ];
    const { plugin, providers, rowStore } = createPlugin(source);
    rowStore.state.items = [0, 2];

    plugin.sort(
      { name: 'asc' },
      { name: getComparer({ prop: 'name' }, 'asc') },
      { name: { prop: 'name' } },
      ['name'],
      ['rgRow'],
    );

    expect(rowStore.setData).toHaveBeenCalledWith({ proxyItems: [1, 2, 3, 0] });
    expect(rowStore.state.proxyItems).toEqual([1, 2, 3, 0]);
    expect(rowStore.state.items).toEqual([2, 0]);
    expect(providers.dimension.updateSizesPositionByNewDataIndexes).toHaveBeenCalledWith(
      'rgRow',
      [2, 0],
      [0, 2],
    );
    expect(rowStore.state.source).toBe(source);
  });

  it('keeps the public sort(types, ignoreViewportUpdate) call shape compatible', () => {
    const source = [{ name: 'A' }, { name: 'B' }];
    const { plugin, providers, rowStore } = createPlugin(source);
    const customDesc = jest.fn((prop: string, a: any, b: any) => {
      return b[prop].localeCompare(a[prop]);
    });

    plugin.sort(
      { name: 'asc' },
      { name: customDesc },
      ['rgRow'],
      true,
    );

    expect(customDesc).toHaveBeenCalled();
    expect(rowStore.setData).toHaveBeenCalledWith({ proxyItems: [1, 0] });
    expect(providers.data.stores.rowPinStart.setData).not.toHaveBeenCalled();
    expect(providers.data.stores.rowPinEnd.setData).not.toHaveBeenCalled();
    expect(providers.dimension.updateSizesPositionByNewDataIndexes).not.toHaveBeenCalled();
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
