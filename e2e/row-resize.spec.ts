import { expect } from '@playwright/test';
import { test, type E2EPage } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  callGridMethod,
  dataCell,
  mainDataRows,
  mountGrid,
  rowHeaderCell,
  setCellsFocus,
  visibleColumnValues,
  withHeaderTestId,
} from './helpers';

type EventSnapshot = {
  name: string;
  rowType: string;
  index: number;
  indexes: number[];
  size: number;
  reason?: string;
};

async function enableRowResize(
  page: E2EPage,
  config?: { minHeight?: number; maxHeight?: number },
) {
  await page.evaluate(async pluginConfig => {
    const loadModule = Function(
      'return import("/build/index.esm.js")',
    ) as () => Promise<{
      RowResizePlugin: new (...args: any[]) => any;
      createRowResizePlugin: (config?: {
        minHeight?: number;
        maxHeight?: number;
      }) => new (...args: any[]) => any;
    }>;
    const { RowResizePlugin, createRowResizePlugin } = await loadModule();
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid was not found');
    grid.plugins = [
      pluginConfig ? createRowResizePlugin(pluginConfig) : RowResizePlugin,
    ];
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    await grid.refresh();
  }, config);
  await page.waitForChanges();
}

function resizeHandle(page: E2EPage, rowIndex: number, rowType = 'rgRow') {
  return page.locator(
    `${SELECTORS.rowHeaderViewport} revogr-data[type="${rowType}"][col-type="rowHeaders"] .rgRow[data-rgrow="${rowIndex}"] > .row-resize-handle`,
  );
}

async function dragHandle(
  page: E2EPage,
  handle: ReturnType<typeof resizeHandle>,
  deltaY: number,
  release = true,
) {
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  // Use the part of the boundary handle that remains inside its owning row.
  // The lower half intentionally overlaps the next row to enlarge the hit area.
  const y = box!.y + 1;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + deltaY, { steps: 5 });
  if (release) {
    await page.mouse.up();
    await page.waitForChanges();
  }
}

async function captureEvents(page: E2EPage) {
  await page.evaluate(() => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid was not found');
    const state = globalThis as typeof globalThis & {
      __rowResizeEvents?: EventSnapshot[];
    };
    state.__rowResizeEvents = [];
    for (const name of [
      'beforerowresize',
      'rowresize',
      'afterrowresize',
      'rowresizecancel',
    ] as const) {
      grid.addEventListener(name, event => {
        const detail = event.detail;
        state.__rowResizeEvents!.push({
          name,
          rowType: detail.rowType,
          index: detail.index,
          indexes: [...detail.indexes],
          size: detail.size,
          ...('reason' in detail && { reason: detail.reason }),
        });
      });
    }
  });
}

async function getEvents(page: E2EPage): Promise<EventSnapshot[]> {
  return page.evaluate(() => {
    const state = globalThis as typeof globalThis & {
      __rowResizeEvents?: EventSnapshot[];
    };
    return state.__rowResizeEvents || [];
  });
}

async function rowIndexByText(page: E2EPage, text: string): Promise<number> {
  const value = await mainDataRows(page)
    .filter({ hasText: text })
    .first()
    .getAttribute('data-rgrow');
  if (value === null) {
    throw new Error(`Could not resolve the virtual row index for "${text}"`);
  }
  return Number(value);
}

async function rowHeightsByText(page: E2EPage, text: string) {
  const index = await rowIndexByText(page, text);
  const data = await mainDataRows(page)
    .filter({ hasText: text })
    .first()
    .boundingBox();
  const header = await page
    .locator(
      `${SELECTORS.rowHeaderViewport} revogr-data[type="rgRow"][col-type="rowHeaders"] > .rgRow[data-rgrow="${index}"]`,
    )
    .boundingBox();
  return { index, data: data!.height, header: header!.height };
}

test.describe('row resize plugin', () => {
  test('is opt-in, supports dynamic row headers, and resizes live', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
      ]),
      source: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Ben' },
      ],
      rowHeaders: false,
      rowSize: 36,
    });

    await expect(page.locator('.row-resize-handle')).toHaveCount(0);
    await enableRowResize(page);
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.rowHeaders = true;
    });
    await page.waitForChanges();
    await captureEvents(page);

    const handle = resizeHandle(page, 0);
    await expect(handle).toBeVisible();
    const before = await rowHeaderCell(page, 0).boundingBox();
    await dragHandle(page, handle, 28, false);
    await page.waitForTimeout(32);

    const live = await rowHeaderCell(page, 0).boundingBox();
    expect(live!.height).toBeGreaterThan(before!.height + 20);
    expect(
      (await getEvents(page)).some(event => event.name === 'rowresize'),
    ).toBe(true);

    await page.mouse.up();
    await page.waitForChanges();
    const afterHeader = await rowHeaderCell(page, 0).boundingBox();
    const afterCell = await dataCell(page, 0, 0).boundingBox();
    expect(Math.abs(afterHeader!.height - afterCell!.height)).toBeLessThan(2);
    expect((await getEvents(page)).map(event => event.name)).toEqual(
      expect.arrayContaining([
        'beforerowresize',
        'rowresize',
        'afterrowresize',
      ]),
    );

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.theme = 'compact';
    });
    await page.waitForChanges();
    const afterTheme = await rowHeaderCell(page, 0).boundingBox();
    expect(afterTheme!.height).toBeCloseTo(afterHeader!.height, 0);
  });

  test('assigns one height to every selected row', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
      ]),
      source: Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        name: `Row ${index + 1}`,
      })),
      rowHeaders: true,
      range: true,
      rowSize: 34,
    });
    await enableRowResize(page);
    await captureEvents(page);
    await setCellsFocus(page, { x: 0, y: 1 }, { x: 1, y: 3 });

    await dragHandle(page, resizeHandle(page, 2), 26);

    const heights = await Promise.all(
      [1, 2, 3].map(
        async index => (await rowHeaderCell(page, index).boundingBox())!.height,
      ),
    );
    expect(new Set(heights.map(Math.round)).size).toBe(1);
    expect(heights[0]).toBeGreaterThan(55);
    expect(
      (await getEvents(page)).find(event => event.name === 'afterrowresize'),
    ).toMatchObject({ rowType: 'rgRow', index: 2, indexes: [1, 2, 3] });
  });

  test('clamps to the configured minimum and restores on Escape', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'id', name: 'ID' }]),
      source: [{ id: 1 }, { id: 2 }],
      rowHeaders: true,
      rowSize: 40,
    });
    await enableRowResize(page, { minHeight: 24, maxHeight: 90 });
    await captureEvents(page);

    await dragHandle(page, resizeHandle(page, 0), -100);
    expect((await rowHeaderCell(page, 0).boundingBox())!.height).toBeCloseTo(
      24,
      0,
    );

    await dragHandle(page, resizeHandle(page, 0), 200);
    expect((await rowHeaderCell(page, 0).boundingBox())!.height).toBeCloseTo(
      90,
      0,
    );

    await dragHandle(page, resizeHandle(page, 1), 30, false);
    await page.waitForTimeout(32);
    expect(
      (await rowHeaderCell(page, 1).boundingBox())!.height,
    ).toBeGreaterThan(60);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForChanges();
    expect((await rowHeaderCell(page, 1).boundingBox())!.height).toBeCloseTo(
      40,
      0,
    );
    expect(
      (await getEvents(page)).find(event => event.name === 'rowresizecancel'),
    ).toMatchObject({ reason: 'escape', indexes: [1] });
  });

  test('honors cancellation before a gesture starts', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'id', name: 'ID' }]),
      source: [{ id: 1 }],
      rowHeaders: true,
      rowSize: 38,
    });
    await enableRowResize(page);
    await page.evaluate(() => {
      document
        .querySelector<HTMLRevoGridElement>('revo-grid')
        ?.addEventListener('beforerowresize', event => event.preventDefault());
    });
    const before = await rowHeaderCell(page, 0).boundingBox();
    await dragHandle(page, resizeHandle(page, 0), 30);
    const after = await rowHeaderCell(page, 0).boundingBox();
    expect(after!.height).toBeCloseTo(before!.height, 0);
  });

  test('keeps pinned, grouped, and deep virtual rows aligned', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'team', name: 'Team' },
      ]),
      source: Array.from({ length: 900 }, (_, index) => ({
        id: index + 1,
        team: index < 450 ? 'North' : 'South',
      })),
      pinnedTopSource: [{ id: 0, team: 'Pinned' }],
      rowHeaders: true,
      rowSize: 32,
      grouping: {
        props: ['team'],
        expandedAll: true,
        prevExpanded: { North: true, South: true },
      },
      height: 320,
    });
    await enableRowResize(page);

    await expect(resizeHandle(page, 0, 'rowPinStart')).toBeVisible();
    await expect(
      page
        .locator(
          `${SELECTORS.rowHeaderViewport} revogr-data[col-type="rowHeaders"] .groupingRow > .row-resize-handle`,
        )
        .first(),
    ).toBeVisible();

    await dragHandle(page, resizeHandle(page, 0, 'rowPinStart'), 18);
    const pinnedHeader = await page
      .locator(
        `${SELECTORS.rowHeaderViewport} revogr-data[type="rowPinStart"] [data-rgrow="0"][data-rgcol="0"]`,
      )
      .boundingBox();
    const pinnedCell = await page
      .locator(
        `${SELECTORS.mainViewport} revogr-data[type="rowPinStart"] [data-rgrow="0"][data-rgcol="0"]`,
      )
      .boundingBox();
    expect(Math.abs(pinnedHeader!.height - pinnedCell!.height)).toBeLessThan(2);

    await callGridMethod(page, 'scrollToRow', 800);
    await page.waitForChanges();
    await expect(resizeHandle(page, 800)).toBeVisible();
    await dragHandle(page, resizeHandle(page, 800), 20);
    const deepHeader = await rowHeaderCell(page, 800).boundingBox();
    const deepCell = await dataCell(page, 800, 0).boundingBox();
    expect(Math.abs(deepHeader!.height - deepCell!.height)).toBeLessThan(2);
  });

  test('preserves plugin and row-definition heights while filtering', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'name', name: 'Name' },
        {
          prop: 'status',
          name: 'Status',
          filter: true,
          ...withHeaderTestId('row-resize-filter-status'),
        },
      ]),
      source: [
        { name: 'Alice', status: 'hide' },
        { name: 'Ben', status: 'keep' },
        { name: 'Cara', status: 'hide' },
        { name: 'Dan', status: 'keep' },
      ],
      filter: true,
      rowHeaders: true,
      rowSize: 36,
      rowDefinitions: [{ type: 'rgRow', index: 3, size: 72 }],
    });
    await enableRowResize(page);
    await dragHandle(page, resizeHandle(page, 1), 24);

    await page
      .getByTestId('row-resize-filter-status')
      .locator(SELECTORS.filterButton)
      .click();
    const panel = page.locator(SELECTORS.filterPanel);
    await panel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('keep');

    await expect.poll(() => visibleColumnValues(page, 0)).toEqual(['Ben', 'Dan']);
    let ben = await rowHeightsByText(page, 'Ben');
    let dan = await rowHeightsByText(page, 'Dan');
    expect(ben.data).toBeCloseTo(60, 0);
    expect(dan.data).toBeCloseTo(72, 0);
    expect(ben.header).toBeCloseTo(ben.data, 0);
    expect(dan.header).toBeCloseTo(dan.data, 0);

    await panel.getByRole('button', { name: 'reset' }).click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Ben', 'Cara', 'Dan']);
    ben = await rowHeightsByText(page, 'Ben');
    dan = await rowHeightsByText(page, 'Dan');
    expect(ben.data).toBeCloseTo(60, 0);
    expect(dan.data).toBeCloseTo(72, 0);
  });

  test('moves resized and row-definition heights with sorted rows', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'name',
          name: 'Name',
          sortable: true,
          ...withHeaderTestId('row-resize-sort-name'),
        },
      ]),
      source: [
        { name: 'Zed' },
        { name: 'Mike' },
        { name: 'Amy' },
        { name: 'Jane' },
      ],
      rowHeaders: true,
      rowSize: 36,
      rowDefinitions: [{ type: 'rgRow', index: 3, size: 72 }],
    });
    await enableRowResize(page);
    await dragHandle(page, resizeHandle(page, 1), 24);

    await page.getByTestId('row-resize-sort-name').click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Amy', 'Jane', 'Mike', 'Zed']);

    const mike = await rowHeightsByText(page, 'Mike');
    const jane = await rowHeightsByText(page, 'Jane');
    expect(mike.data).toBeCloseTo(60, 0);
    expect(jane.data).toBeCloseTo(72, 0);
    expect(mike.header).toBeCloseTo(mike.data, 0);
    expect(jane.header).toBeCloseTo(jane.data, 0);
  });

  test('keeps the resized grouped-row slot aligned when grouping rebuilds after sort', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'name',
          name: 'Name',
          sortable: true,
          ...withHeaderTestId('grouped-row-resize-sort-name'),
        },
      ]),
      source: [
        { name: 'Charlie', team: 'North' },
        { name: 'Alice', team: 'North' },
        { name: 'Dan', team: 'South' },
        { name: 'Ben', team: 'South' },
      ],
      grouping: {
        props: ['team'],
        expandedAll: true,
        prevExpanded: { North: true, South: true },
      },
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    const charlieIndex = await rowIndexByText(page, 'Charlie');
    await dragHandle(page, resizeHandle(page, charlieIndex), 26);

    await page.getByTestId('grouped-row-resize-sort-name').click();
    await expect.poll(() => visibleColumnValues(page, 0)).toEqual([
      'Alice',
      'Charlie',
      'Ben',
      'Dan',
    ]);

    const alice = await rowHeightsByText(page, 'Alice');
    const charlie = await rowHeightsByText(page, 'Charlie');
    expect(alice.data).toBeCloseTo(62, 0);
    expect(charlie.data).toBeCloseTo(36, 0);
    expect(alice.header).toBeCloseTo(alice.data, 0);
  });

  test('moves a resized row height through row reordering and theme changes', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'name', name: 'Name', rowDrag: true },
        { prop: 'role', name: 'Role' },
      ]),
      source: [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Ben', role: 'Designer' },
        { name: 'Cara', role: 'Manager' },
      ],
      rowHeaders: true,
    });
    await enableRowResize(page);
    const before = await rowHeightsByText(page, 'Ben');
    await dragHandle(page, resizeHandle(page, 1), 24);

    const rowDragHandle = mainDataRows(page)
      .filter({ hasText: 'Ben' })
      .locator('[data-rgcol="0"] .revo-draggable');
    const target = mainDataRows(page).filter({ hasText: 'Cara' });
    const handleBox = await rowDragHandle.boundingBox();
    const targetBox = await target.boundingBox();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height + 16,
      { steps: 12 },
    );
    await page.mouse.up();
    await expect.poll(() => visibleColumnValues(page, 0)).toEqual([
      'Alice',
      'Cara',
      'Ben',
    ]);

    let ben = await rowHeightsByText(page, 'Ben');
    expect(ben.data).toBeCloseTo(before.data + 24, 0);
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.theme = 'compact';
    });
    await page.waitForChanges();
    ben = await rowHeightsByText(page, 'Ben');
    expect(ben.data).toBeCloseTo(before.data + 24, 0);
    expect(ben.header).toBeCloseTo(ben.data, 0);
  });

  test('keeps resized group and child rows stable across collapse and expand', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [
        { name: 'Alice', team: 'North' },
        { name: 'Ben', team: 'North' },
        { name: 'Cara', team: 'South' },
      ],
      grouping: {
        props: ['team'],
        expandedAll: true,
        prevExpanded: { North: true, South: true },
      },
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);

    const northIndex = await rowIndexByText(page, 'North');
    const aliceIndex = await rowIndexByText(page, 'Alice');
    await dragHandle(page, resizeHandle(page, northIndex), 18);
    await dragHandle(page, resizeHandle(page, aliceIndex), 26);

    const northGroup = mainDataRows(page).filter({ hasText: 'North' }).first();
    await northGroup.locator(SELECTORS.groupExpandButton).click();
    await expect(mainDataRows(page).filter({ hasText: 'Alice' })).toHaveCount(0);
    let north = await rowHeightsByText(page, 'North');
    expect(north.data).toBeCloseTo(54, 0);
    expect(north.header).toBeCloseTo(north.data, 0);

    await northGroup.locator(SELECTORS.groupExpandButton).click();
    await expect(mainDataRows(page).filter({ hasText: 'Alice' })).toHaveCount(1);
    north = await rowHeightsByText(page, 'North');
    const alice = await rowHeightsByText(page, 'Alice');
    expect(north.data).toBeCloseTo(54, 0);
    expect(alice.data).toBeCloseTo(62, 0);
    expect(alice.header).toBeCloseTo(alice.data, 0);
  });

  test('keeps committed row-position heights through source replacement and theme change', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [{ name: 'Alice' }, { name: 'Ben' }],
      rowHeaders: true,
    });
    await enableRowResize(page);
    const before = await rowHeightsByText(page, 'Alice');
    await dragHandle(page, resizeHandle(page, 0), 24);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.source = [{ name: 'New first' }, { name: 'New second' }];
    });
    await page.waitForChanges();
    let first = await rowHeightsByText(page, 'New first');
    expect(first.data).toBeCloseTo(before.data + 24, 0);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.theme = 'compact';
    });
    await page.waitForChanges();
    first = await rowHeightsByText(page, 'New first');
    expect(first.data).toBeCloseTo(before.data + 24, 0);
    expect(first.header).toBeCloseTo(first.data, 0);
  });
});
