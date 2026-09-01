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
  config?: { minHeight?: number; maxHeight?: number; fullRow?: boolean },
) {
  await page.evaluate(pluginConfig => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid was not found');
    grid.resizeRow = pluginConfig ?? true;
  }, config);
  await page.evaluate(async () => {
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.waitForChanges();
}

function resizeHandle(page: E2EPage, rowIndex: number, rowType = 'rgRow') {
  return page.locator(
    `${SELECTORS.rowHeaderViewport} revogr-data[type="${rowType}"][col-type="rowHeaders"] .rgRow[data-rgrow="${rowIndex}"] > .row-resize-handle`,
  );
}

function dataResizeHandle(page: E2EPage, rowIndex: number) {
  return page
    .locator(
      `revogr-data[type="rgRow"][col-type="rgCol"] .rgRow[data-rgrow="${rowIndex}"] > .row-resize-handle`,
    )
    .first();
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

async function rowHeightsByExactText(page: E2EPage, text: string) {
  const row = mainDataRows(page)
    .filter({ has: page.getByText(text, { exact: true }) })
    .first();
  const index = Number(await row.getAttribute('data-rgrow'));
  const data = await row.boundingBox();
  const header = await rowHeaderCell(page, index).boundingBox();
  return { index, data: data!.height, header: header!.height };
}

async function mainVerticalScrollMetrics(page: E2EPage) {
  return page
    .locator(`${SELECTORS.mainViewport} .vertical-inner`)
    .evaluate((element: HTMLElement) => ({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
}

async function scrollMainToBottom(page: E2EPage) {
  await page
    .locator(`${SELECTORS.mainViewport} .vertical-inner`)
    .evaluate((element: HTMLElement) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
  await page.waitForChanges();
}

async function expectMainViewportAtTail(page: E2EPage) {
  await expect
    .poll(async () => {
      const { scrollTop, scrollHeight, clientHeight } =
        await mainVerticalScrollMetrics(page);
      return scrollHeight - clientHeight - scrollTop;
    })
    // The virtual viewport intentionally keeps up to one origin row as an
    // end buffer. The important invariant is that the rendered tail remains
    // present rather than falling behind each resized row.
    .toBeLessThanOrEqual(36);
}

async function lastRenderedRowHeader(page: E2EPage) {
  return Math.max(
    ...(await page
      .locator(`${SELECTORS.rowHeaderViewport} ${SELECTORS.renderedRows}`)
      .evaluateAll(rows =>
        rows.map(row => Number(row.getAttribute('data-rgrow'))),
      )),
  );
}

test.describe('row resize plugin', () => {
  test('stays registered and activates in place from resize-row', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [{ name: 'Alice' }],
      rowHeaders: true,
    });

    const registration = await page.evaluate(async () => {
      const loadModule = Function(
        'return import("/build/index.esm.js")',
      ) as () => Promise<{
        RowResizePlugin: new (...args: any[]) => any;
      }>;
      const { RowResizePlugin } = await loadModule();
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      const before = (await grid.getPlugins()).find(
        plugin => plugin instanceof RowResizePlugin,
      );
      grid.resizeRow = true;
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const after = (await grid.getPlugins()).filter(
        plugin => plugin instanceof RowResizePlugin,
      );
      return {
        registeredWhileDisabled: !!before,
        sameInstance: after.length === 1 && after[0] === before,
      };
    });
    await page.waitForChanges();

    expect(registration).toEqual({
      registeredWhileDisabled: true,
      sameInstance: true,
    });
    await expect(resizeHandle(page, 0)).toBeVisible();
  });

  test('resizes from the full row edge when enabled in resize-row config', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [{ name: 'Alice' }],
      rowHeaders: false,
      rowSize: 36,
      resizeRow: { fullRow: true },
    });

    await expect(page.locator(SELECTORS.rowHeaderViewport)).toHaveCount(0);
    const handle = dataResizeHandle(page, 0);
    await expect(handle).toBeVisible();
    const before = await dataCell(page, 0, 0).boundingBox();
    await dragHandle(page, handle, 24);
    const after = await dataCell(page, 0, 0).boundingBox();

    expect(after!.height).toBeGreaterThan(before!.height + 18);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.resizeRow = false;
    });
    await page.waitForChanges();
    await expect(page.locator('.row-resize-handle')).toHaveCount(0);
  });

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
    await dragHandle(page, resizeHandle(page, 0), 24);

    await page
      .getByTestId('row-resize-filter-status')
      .locator(SELECTORS.filterButton)
      .click();
    const panel = page.locator(SELECTORS.filterPanel);
    await panel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('keep');

    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Ben', 'Dan']);
    const ben = await rowHeightsByText(page, 'Ben');
    let dan = await rowHeightsByText(page, 'Dan');
    expect(ben.data).toBeCloseTo(36, 0);
    expect(dan.data).toBeCloseTo(72, 0);
    expect(ben.header).toBeCloseTo(ben.data, 0);
    expect(dan.header).toBeCloseTo(dan.data, 0);

    await panel.getByRole('button', { name: 'reset' }).click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Ben', 'Cara', 'Dan']);
    const alice = await rowHeightsByText(page, 'Alice');
    dan = await rowHeightsByText(page, 'Dan');
    expect(alice.data).toBeCloseTo(60, 0);
    expect(dan.data).toBeCloseTo(72, 0);
  });

  test('maps row definitions assigned while filtered without clearing provider sizes', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'name', name: 'Name' },
        {
          prop: 'status',
          name: 'Status',
          filter: true,
          ...withHeaderTestId('filtered-row-definition-status'),
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
    });
    await enableRowResize(page);
    await dragHandle(page, resizeHandle(page, 0), 24);

    await page
      .getByTestId('filtered-row-definition-status')
      .locator(SELECTORS.filterButton)
      .click();
    const panel = page.locator(SELECTORS.filterPanel);
    await panel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('keep');
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Ben', 'Dan']);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.rowDefinitions = [{ type: 'rgRow', index: 3, size: 72 }];
    });
    await expect
      .poll(async () => (await rowHeightsByText(page, 'Dan')).data)
      .toBeCloseTo(72, 0);
    await page.evaluate(async () => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      const providers = await grid.getProviders();
      providers?.dimension.setCustomSizes('rgRow', { 0: 81 }, true);
    });

    await panel.getByRole('button', { name: 'reset' }).click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Ben', 'Cara', 'Dan']);
    expect((await rowHeightsByText(page, 'Alice')).data).toBeCloseTo(81, 0);
    expect((await rowHeightsByText(page, 'Dan')).data).toBeCloseTo(72, 0);
  });

  test('keeps a row resized while filtered attached to its physical row', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'name', name: 'Name' },
        {
          prop: 'status',
          name: 'Status',
          filter: true,
          ...withHeaderTestId('filtered-row-resize-status'),
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

    await page
      .getByTestId('filtered-row-resize-status')
      .locator(SELECTORS.filterButton)
      .click();
    const panel = page.locator(SELECTORS.filterPanel);
    await panel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('keep');
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Ben', 'Dan']);

    await dragHandle(page, resizeHandle(page, 0), 24);
    expect(
      await page.evaluate(() => {
        const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
        return grid?.rowDefinitions;
      }),
    ).toEqual(
      expect.arrayContaining([
        { type: 'rgRow', index: 1, size: 60 },
        { type: 'rgRow', index: 3, size: 72 },
      ]),
    );
    await panel.getByRole('button', { name: 'reset' }).click();

    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Ben', 'Cara', 'Dan']);
    const alice = await rowHeightsByText(page, 'Alice');
    const ben = await rowHeightsByText(page, 'Ben');
    const dan = await rowHeightsByText(page, 'Dan');
    expect(alice.data).toBeCloseTo(36, 0);
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

  test('keeps a resized grouped row attached to its source across sort and clear', async ({
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
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Charlie', 'Ben', 'Dan']);

    const alice = await rowHeightsByText(page, 'Alice');
    const charlie = await rowHeightsByText(page, 'Charlie');
    expect(alice.data).toBeCloseTo(36, 0);
    expect(charlie.data).toBeCloseTo(62, 0);
    expect(charlie.header).toBeCloseTo(charlie.data, 0);

    await page.getByTestId('grouped-row-resize-sort-name').click();
    await page.getByTestId('grouped-row-resize-sort-name').click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Charlie', 'Alice', 'Dan', 'Ben']);

    const restoredCharlie = await rowHeightsByText(page, 'Charlie');
    expect(restoredCharlie.data).toBeCloseTo(62, 0);
    expect(restoredCharlie.header).toBeCloseTo(restoredCharlie.data, 0);
  });

  test('keeps a grouped child resize committed when resized after sorting', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'name',
          name: 'Name',
          sortable: true,
          ...withHeaderTestId('sorted-group-child-resize-name'),
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

    await page.getByTestId('sorted-group-child-resize-name').click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Charlie', 'Ben', 'Dan']);

    const charlieIndex = await rowIndexByText(page, 'Charlie');
    await dragHandle(page, resizeHandle(page, charlieIndex), 26);

    let alice = await rowHeightsByText(page, 'Alice');
    let charlie = await rowHeightsByText(page, 'Charlie');
    expect(alice.data).toBeCloseTo(36, 0);
    expect(charlie.data).toBeCloseTo(62, 0);
    expect(charlie.header).toBeCloseTo(charlie.data, 0);

    await page.getByTestId('sorted-group-child-resize-name').click();
    await page.getByTestId('sorted-group-child-resize-name').click();
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Charlie', 'Alice', 'Dan', 'Ben']);

    alice = await rowHeightsByText(page, 'Alice');
    charlie = await rowHeightsByText(page, 'Charlie');
    expect(alice.data).toBeCloseTo(36, 0);
    expect(charlie.data).toBeCloseTo(62, 0);
    expect(charlie.header).toBeCloseTo(charlie.data, 0);
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
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Cara', 'Ben']);

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
    await expect(mainDataRows(page).filter({ hasText: 'Alice' })).toHaveCount(
      0,
    );
    let north = await rowHeightsByText(page, 'North');
    expect(north.data).toBeCloseTo(54, 0);
    expect(north.header).toBeCloseTo(north.data, 0);

    await northGroup.locator(SELECTORS.groupExpandButton).click();
    await expect(mainDataRows(page).filter({ hasText: 'Alice' })).toHaveCount(
      1,
    );
    north = await rowHeightsByText(page, 'North');
    const alice = await rowHeightsByText(page, 'Alice');
    expect(north.data).toBeCloseTo(54, 0);
    expect(alice.data).toBeCloseTo(62, 0);
    expect(alice.header).toBeCloseTo(alice.data, 0);
  });

  test('does not create blank rows below a partially collapsed grouped grid', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name', rowDrag: true }]),
      source: Array.from({ length: 100 }, (_, index) => ({
        name: `${index}:0`,
        key: index % 2 ? 'a' : 'b',
        ...(index % 4 ? { key2: 'c' } : index % 3 ? { key2: 'd' } : {}),
      })),
      grouping: {
        props: ['key', 'key2'],
        expandedAll: false,
        prevExpanded: { 'a': true, 'a,c': true },
      },
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page, { fullRow: true });
    await expect(mainDataRows(page).filter({ hasText: '0:0' })).toHaveCount(0);

    await scrollMainToBottom(page);
    const bottomRowBeforeResize = await lastRenderedRowHeader(page);
    expect(bottomRowBeforeResize).toBe(52);
    const contentSizeBeforeResize = await callGridMethod<{ y: number }>(
      page,
      'getContentSize',
    );

    await callGridMethod(page, 'scrollToRow', 0);
    await page.waitForChanges();
    let resizedChildIndex = await rowIndexByText(page, '7:0');
    await dragHandle(page, resizeHandle(page, resizedChildIndex), 200);
    resizedChildIndex = await rowIndexByText(page, '3:0');
    const secondHandle = resizeHandle(page, resizedChildIndex);
    await expect(secondHandle).toBeVisible();
    await dragHandle(page, secondHandle, 200);
    const contentSizeAfterResize = await callGridMethod<{ y: number }>(
      page,
      'getContentSize',
    );
    await scrollMainToBottom(page);
    expect(await lastRenderedRowHeader(page)).toBe(bottomRowBeforeResize);
    await expect(mainDataRows(page).filter({ hasText: '99:0' })).toHaveCount(1);
    expect(contentSizeAfterResize.y).toBe(contentSizeBeforeResize.y + 400);
  });

  test('keeps a grouped bottom viewport anchored through repeated row resizes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1888, height: 1632 });
    await mountGrid(page, {
      columns: buildColumns(
        Array.from({ length: 9 }, (_, index) => ({
          prop: String(index),
          name: String.fromCodePoint(65 + index),
          size: 200,
          rowDrag: index === 0,
        })),
      ),
      source: Array.from({ length: 100 }, (_, rowIndex) => ({
        ...Object.fromEntries(
          Array.from({ length: 9 }, (_, columnIndex) => [
            columnIndex,
            `${rowIndex}:${columnIndex}`,
          ]),
        ),
        key: rowIndex % 2 ? 'a' : 'b',
        ...(rowIndex % 4 ? { key2: 'c' } : rowIndex % 3 ? { key2: 'd' } : {}),
      })),
      grouping: {
        props: ['key', 'key2'],
        expandedAll: false,
        prevExpanded: { 'a': true, 'a,c': true },
      },
      rowHeaders: true,
      rowSize: 36,
      height: 1560,
    });
    await enableRowResize(page, { fullRow: true });
    for (const value of ['7:0', '13:0', '17:0']) {
      const row = await rowHeightsByText(page, value);
      await dragHandle(page, resizeHandle(page, row.index), 200);
    }
    await scrollMainToBottom(page);
    await expectMainViewportAtTail(page);
    expect(await lastRenderedRowHeader(page)).toBe(52);

    const contentSizeBefore = await callGridMethod<{ y: number }>(
      page,
      'getContentSize',
    );
    const firstBefore = await rowHeightsByText(page, '93:0');
    const firstHandle = resizeHandle(page, firstBefore.index);
    const firstHandleBox = await firstHandle.boundingBox();
    expect(firstHandleBox).not.toBeNull();
    const pointerX = firstHandleBox!.x + firstHandleBox!.width / 2;
    const pointerY = firstHandleBox!.y + 1;
    await page.mouse.move(pointerX, pointerY);
    await page.mouse.down();
    for (const delta of [30, 60, 90, 120]) {
      await page.mouse.move(pointerX, pointerY + delta);
      await page.waitForTimeout(50);
      await page.waitForChanges();
      await expect.poll(() => lastRenderedRowHeader(page)).toBe(52);
      await expect
        .poll(() => mainDataRows(page).filter({ hasText: '99:0' }).count())
        .toBe(1);
    }
    await page.mouse.up();
    await page.waitForChanges();
    await expectMainViewportAtTail(page);
    expect(await lastRenderedRowHeader(page)).toBe(52);
    await expect(mainDataRows(page).filter({ hasText: '99:0' })).toHaveCount(1);
    expect((await rowHeightsByText(page, '93:0')).data).toBeCloseTo(
      firstBefore.data + 120,
      0,
    );

    const secondBefore = await rowHeightsByText(page, '87:0');
    await dragHandle(page, resizeHandle(page, secondBefore.index), 90);
    await expectMainViewportAtTail(page);
    expect(await lastRenderedRowHeader(page)).toBe(52);
    await expect(mainDataRows(page).filter({ hasText: '99:0' })).toHaveCount(1);
    expect((await rowHeightsByText(page, '87:0')).data).toBeCloseTo(
      secondBefore.data + 90,
      0,
    );

    const thirdBefore = await rowHeightsByText(page, '71:0');
    await dragHandle(page, resizeHandle(page, thirdBefore.index), 70);
    await expectMainViewportAtTail(page);
    expect(await lastRenderedRowHeader(page)).toBe(52);
    await expect(mainDataRows(page).filter({ hasText: '99:0' })).toHaveCount(1);
    expect((await rowHeightsByText(page, '71:0')).data).toBeCloseTo(
      thirdBefore.data + 70,
      0,
    );

    const firstExpanded = await rowHeightsByText(page, '93:0');
    await dragHandle(page, resizeHandle(page, firstExpanded.index), -50);
    await expectMainViewportAtTail(page);
    expect(await lastRenderedRowHeader(page)).toBe(52);
    await expect(mainDataRows(page).filter({ hasText: '99:0' })).toHaveCount(1);
    expect((await rowHeightsByText(page, '93:0')).data).toBeCloseTo(
      firstExpanded.data - 50,
      0,
    );

    const renderedHeaderIndexes = await page
      .locator(`${SELECTORS.rowHeaderViewport} ${SELECTORS.renderedRows}`)
      .evaluateAll(rows =>
        rows.map(row => Number(row.getAttribute('data-rgrow'))),
      );
    expect(Math.max(...renderedHeaderIndexes)).toBe(52);
    const contentSizeAfter = await callGridMethod<{ y: number }>(
      page,
      'getContentSize',
    );
    expect(contentSizeAfter.y).toBe(contentSizeBefore.y + 230);
  });

  test('keeps a resized row attached when the trailing sorted group expands', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'value',
          name: 'Value',
          sortable: true,
          ...withHeaderTestId('expand-after-resize-sort'),
        },
      ]),
      source: Array.from({ length: 100 }, (_, index) => ({
        value: `${index}:0`,
        key: index % 2 ? 'a' : 'b',
        ...(index % 4 ? { key2: 'c' } : index % 3 ? { key2: 'd' } : {}),
      })),
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page, { fullRow: true });

    const sortHeader = page.getByTestId('expand-after-resize-sort');
    await sortHeader.click();
    await sortHeader.click();
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.grouping = {
        props: ['key', 'key2'],
        expandedAll: false,
        prevExpanded: { 'a': true, 'a,c': true },
      };
    });
    await page.waitForChanges();
    await scrollMainToBottom(page);
    await expect(
      mainDataRows(page).filter({
        has: page.getByText('25:0', { exact: true }),
      }),
    ).toHaveCount(1);

    const resizedBefore = await rowHeightsByExactText(page, '25:0');
    await dragHandle(page, resizeHandle(page, resizedBefore.index), 200);
    await expect
      .poll(async () => (await rowHeightsByExactText(page, '25:0')).data)
      .toBeCloseTo(236, 0);

    const trailingGroup = page
      .locator(`${SELECTORS.mainViewport} .groupingRow`)
      .filter({ hasText: 'b' })
      .last();
    await trailingGroup.locator(SELECTORS.groupExpandButton).click();
    await page.waitForChanges();

    const state = await page.evaluate(async () => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      const store = await grid.getSourceStore();
      const providers = await grid.getProviders();
      const physicalIndex = store
        .get('source')
        .findIndex((row: Record<string, unknown>) => row.value === '25:0');
      const resizedVirtualIndex = store.get('items').indexOf(physicalIndex);
      return {
        itemCount: store.get('items').length,
        dimensionCount: providers?.dimension.stores.rgRow.store.get('count'),
        realSize: providers?.dimension.stores.rgRow.store.get('realSize'),
        resizedVirtualIndex,
        resizedSize:
          providers?.dimension.stores.rgRow.store.get('sizes')[
            resizedVirtualIndex
          ],
      };
    });
    expect(state.dimensionCount).toBe(state.itemCount);
    expect(state.realSize).toBe(state.itemCount * 36 + 200);
    expect(state.resizedVirtualIndex).toBeGreaterThanOrEqual(0);
    expect(state.resizedSize).toBe(236);

    await expectMainViewportAtTail(page);
    await expect.poll(() => lastRenderedRowHeader(page)).toBe(state.itemCount - 1);
  });

  test('keeps a non-grouped bottom viewport anchored while resizing', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: Array.from({ length: 30 }, (_, index) => ({
        name: `Row ${index}`,
      })),
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await scrollMainToBottom(page);
    await expectMainViewportAtTail(page);

    const before = await rowHeightsByText(page, 'Row 27');
    await dragHandle(page, resizeHandle(page, before.index), 80);

    await expectMainViewportAtTail(page);
    await expect(mainDataRows(page).filter({ hasText: 'Row 29' })).toHaveCount(
      1,
    );
    expect((await rowHeightsByText(page, 'Row 27')).data).toBeCloseTo(
      before.data + 80,
      0,
    );
  });

  test('clears deferred bottom anchoring when row resize is disabled', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: Array.from({ length: 60 }, (_, index) => ({
        name: `Row ${index}`,
      })),
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await scrollMainToBottom(page);

    const row = await rowHeightsByText(page, 'Row 57');
    await dragHandle(page, resizeHandle(page, row.index), 80, false);
    await page.waitForTimeout(32);
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.resizeRow = false;
    });
    await page.waitForChanges();
    await page.mouse.up();

    await callGridMethod(page, 'scrollToRow', 10);
    await page.waitForChanges();
    const scrollBeforeEnable = await mainVerticalScrollMetrics(page);
    await enableRowResize(page);
    const scrollAfterEnable = await mainVerticalScrollMetrics(page);

    expect(scrollAfterEnable.scrollTop).toBeCloseTo(
      scrollBeforeEnable.scrollTop,
      0,
    );
    expect(
      scrollAfterEnable.scrollHeight -
        scrollAfterEnable.clientHeight -
        scrollAfterEnable.scrollTop,
    ).toBeGreaterThan(36);
  });

  test('does not defer bottom anchoring for a resize with no movement', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: Array.from({ length: 60 }, (_, index) => ({
        name: `Row ${index}`,
      })),
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await scrollMainToBottom(page);

    const row = await rowHeightsByText(page, 'Row 57');
    await dragHandle(page, resizeHandle(page, row.index), 0);
    await callGridMethod(page, 'scrollToRow', 10);
    await page.waitForChanges();

    const scroll = await mainVerticalScrollMetrics(page);
    expect(scroll.scrollTop).toBeLessThan(
      scroll.scrollHeight - scroll.clientHeight - 36,
    );
    await expect(mainDataRows(page).filter({ hasText: 'Row 10' })).toHaveCount(
      1,
    );
  });

  test('does not bottom-anchor a resize started away from the bottom', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: Array.from({ length: 60 }, (_, index) => ({
        name: `Row ${index}`,
      })),
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await callGridMethod(page, 'scrollToRow', 20);
    await page.waitForChanges();
    const beforeScroll = await mainVerticalScrollMetrics(page);
    const before = await rowHeightsByText(page, 'Row 22');

    await dragHandle(page, resizeHandle(page, before.index), 80);

    const afterScroll = await mainVerticalScrollMetrics(page);
    expect(afterScroll.scrollTop).toBeCloseTo(beforeScroll.scrollTop, 0);
    expect(afterScroll.scrollHeight - afterScroll.clientHeight).toBeGreaterThan(
      afterScroll.scrollTop,
    );
    expect((await rowHeightsByText(page, 'Row 22')).data).toBeCloseTo(
      before.data + 80,
      0,
    );
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

  test('rebuilds committed heights after reordered source replacement', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name', rowDrag: true }]),
      source: [{ name: 'Alice' }, { name: 'Ben' }, { name: 'Cara' }],
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
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
    await expect
      .poll(() => visibleColumnValues(page, 0))
      .toEqual(['Alice', 'Cara', 'Ben']);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.source = [
        { name: 'New first' },
        { name: 'New second' },
        { name: 'New third' },
      ];
    });
    await page.waitForChanges();

    expect((await rowHeightsByText(page, 'New second')).data).toBeCloseTo(
      60,
      0,
    );
    expect((await rowHeightsByText(page, 'New third')).data).toBeCloseTo(36, 0);
  });

  test('does not revive a pruned height after the source grows again', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [{ name: 'Alice' }, { name: 'Ben' }, { name: 'Cara' }],
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await dragHandle(page, resizeHandle(page, 2), 24);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.source = [{ name: 'Short first' }, { name: 'Short second' }];
    });
    await page.waitForChanges();
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.source = [
        { name: 'Grown first' },
        { name: 'Grown second' },
        { name: 'Grown third' },
      ];
    });
    await page.waitForChanges();

    expect((await rowHeightsByText(page, 'Grown third')).data).toBeCloseTo(
      36,
      0,
    );
  });

  test('keeps committed heights when rowSize changes at runtime', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [{ name: 'Alice' }, { name: 'Ben' }],
      rowHeaders: true,
      rowSize: 36,
    });
    await enableRowResize(page);
    await dragHandle(page, resizeHandle(page, 0), 24);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (grid) grid.rowSize = 42;
    });
    await page.waitForChanges();

    const alice = await rowHeightsByText(page, 'Alice');
    const ben = await rowHeightsByText(page, 'Ben');
    expect(alice.data).toBeCloseTo(60, 0);
    expect(alice.header).toBeCloseTo(alice.data, 0);
    expect(ben.data).toBeCloseTo(42, 0);
  });
});
