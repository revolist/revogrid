import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import type { E2EPage } from '@stencil/playwright';
import type { ColumnData } from '../src';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  buildRows,
  expectChildHeaderUnderGroup,
  mountGrid,
  scrollToCell,
  visibleHeaderTexts,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('column groups', () => {
  test('renders column groups correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 401, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 402, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      {
        name: 'Identity',
        ...withHeaderTestId('group-identity'),
        children: [
          { prop: 'id', name: 'ID', ...withHeaderTestId('child-id') },
          { prop: 'name', name: 'Name', ...withHeaderTestId('child-name') },
        ],
      },
      {
        name: 'Details',
        ...withHeaderTestId('group-details'),
        children: [
          { prop: 'role', name: 'Role', ...withHeaderTestId('child-role') },
          { prop: 'city', name: 'City', ...withHeaderTestId('child-city') },
        ],
      },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.getByTestId('group-identity')).toBeVisible();
    await expect(page.getByTestId('group-details')).toBeVisible();
    await expect(page.getByTestId('child-id')).toBeVisible();
    await expect(page.getByTestId('child-name')).toBeVisible();
    await expect(page.getByTestId('child-role')).toBeVisible();
    await expect(page.getByTestId('child-city')).toBeVisible();

    await expectChildHeaderUnderGroup(page, 'child-id', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-name', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-role', 'group-details');
    await expectChildHeaderUnderGroup(page, 'child-city', 'group-details');
  });

  test('keeps first data row editable below deep column groups', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      {
        name: 'Level 1',
        children: [
          {
            name: 'Level 2',
            children: [
              {
                name: 'Level 3',
                children: [
                  {
                    name: 'Level 4',
                    children: [
                      {
                        name: 'Level 5',
                        children: [
                          { prop: 'id', name: 'ID' },
                          { prop: 'name', name: 'Name' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      resize: true,
      rowSize: 30,
      colSize: 120,
    });

    const firstCell = dataCell(page, 0, 1);
    await expect(firstCell).toHaveText('Alice');

    const layout = await firstCell.evaluate(element => {
      const header = document.querySelector('revo-grid revogr-header');
      const cellRect = element.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      return {
        headerBottom: headerRect?.bottom ?? 0,
        cellTop: cellRect.top,
      };
    });

    expect(layout.cellTop).toBeGreaterThanOrEqual(layout.headerBottom);

    const hitTarget = await firstCell.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return {
        tagName: target?.tagName,
        className: target instanceof HTMLElement ? target.className : '',
        dataRow: target instanceof HTMLElement ? target.getAttribute('data-rgrow') : null,
        dataCol: target instanceof HTMLElement ? target.getAttribute('data-rgcol') : null,
      };
    });

    expect(hitTarget).toMatchObject({
      tagName: 'DIV',
      dataRow: '0',
      dataCol: '1',
    });
    expect(String(hitTarget.className)).toContain('rgCell');
    expect(String(hitTarget.className)).not.toContain('rgHeaderCell');
    expect(String(hitTarget.className)).not.toContain('resizable');

    await firstCell.dblclick();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
  });

  test('virtualizes one-child group headers with the visible column window', async ({ page }) => {
    const groupCount = 120;
    const colSize = 90;
    const columns = buildOneChildGroupColumns(groupCount, colSize);
    const source = buildRows(2, flattenLeafProps(columns));

    await mountGrid(page, {
      width: 360,
      height: 260,
      colSize,
      columns,
      source,
    });

    const groupCells = groupHeaderCells(page);
    await expect.poll(() => groupCells.count()).toBeGreaterThan(0);
    await expectCountLessThan(groupCells, groupCount);
    await expect(groupCells.filter({ hasText: 'Day 000' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 080' })).toHaveCount(0);

    await scrollToCell(page, colSize * 80, 0);

    await expect(groupCells.filter({ hasText: 'Day 080' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 000' })).toHaveCount(0);
    await expectCountLessThan(groupCells, groupCount);
  });

  test('virtualizes nested group headers at each grouping level', async ({ page }) => {
    const columns = buildNestedGroupColumns();
    const leafProps = flattenLeafProps(columns);

    await mountGrid(page, {
      width: 420,
      height: 260,
      colSize: 70,
      columns,
      source: buildRows(2, leafProps),
    });

    const groupCells = groupHeaderCells(page);
    await expect.poll(() => groupCells.count()).toBeGreaterThan(0);
    await expectCountLessThan(groupCells, 60);
    await expect(groupCells.filter({ hasText: 'Year 0' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Month 00-00' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Year 3' })).toHaveCount(0);
    await expect(groupCells.filter({ hasText: 'Month 03-05' })).toHaveCount(0);

    await scrollToCell(page, 70 * 42, 0);

    await expect(groupCells.filter({ hasText: 'Year 3' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Month 03-02' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Year 0' })).toHaveCount(0);
    await expectCountLessThan(groupCells, 60);
  });

  test('keeps partially overlapping multi-level group headers while virtualizing hidden children', async ({ page }) => {
    const columns = buildNestedGroupColumns();

    await mountGrid(page, {
      width: 420,
      height: 260,
      colSize: 70,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    const groupCells = groupHeaderCells(page);

    await scrollToCell(page, 70 * 7, 0);

    await expect(groupCells.filter({ hasText: 'Year 0' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Month 00-00' })).toHaveCount(0);
    await expect(groupCells.filter({ hasText: 'Month 00-03' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Month 00-05' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Year 1' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Month 01-00' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Year 2' })).toHaveCount(0);
    await expectCountLessThan(groupCells, 10);
  });

  test('resizes every child in a partially visible grouped column span', async ({ page }) => {
    const columns = buildNestedGroupColumns();

    await mountGrid(page, {
      width: 420,
      height: 260,
      colSize: 70,
      resize: true,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      const state = globalThis as typeof globalThis & {
        __resizeYear0?: (e: { changedX: number }) => void;
        __resizeDetail?: Record<string, number>;
      };
      grid.addEventListener('beforegroupheaderrender', (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.group.name === 'Year 0') {
          state.__resizeYear0 = detail.onResize;
        }
      });
      grid.addEventListener('headerresize', (event: Event) => {
        state.__resizeDetail = (event as CustomEvent<Record<string, number>>).detail;
      });
    });

    await scrollToCell(page, 70 * 7, 0);
    await page.evaluate(() => {
      const state = globalThis as typeof globalThis & {
        __resizeYear0?: (e: { changedX: number }) => void;
      };
      state.__resizeYear0?.({ changedX: 120 });
    });
    await page.waitForChanges();

    const resizedIndexes = await page.evaluate(() => {
      const state = globalThis as typeof globalThis & {
        __resizeDetail?: Record<string, number>;
      };
      return Object.keys(state.__resizeDetail || {}).map(Number).sort((a, b) => a - b);
    });

    expect(resizedIndexes).toEqual(Array.from({ length: 12 }, (_, index) => index));
  });

  test('virtualizes grouped columns when mixed with regular columns', async ({ page }) => {
    const colSize = 80;
    const columns: ColumnData = [
      { prop: 'rowId', name: 'Row ID', size: colSize },
      ...buildOneChildGroupColumns(80, colSize),
      { prop: 'notes', name: 'Notes', size: colSize },
    ];
    const source = buildRows(2, ['rowId', ...flattenLeafProps(columns), 'notes']);

    await mountGrid(page, {
      width: 400,
      height: 260,
      colSize,
      columns,
      source,
    });

    const groupCells = groupHeaderCells(page);
    await expect.poll(() => groupCells.count()).toBeGreaterThan(0);
    await expect(groupCells.filter({ hasText: 'Day 000' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 050' })).toHaveCount(0);
    await expectCountLessThan(groupCells, 80);

    await scrollToCell(page, colSize * 51, 0);

    await expect(groupCells.filter({ hasText: 'Day 050' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 000' })).toHaveCount(0);
    await expectCountLessThan(groupCells, 80);
  });

  test('keeps grouped column viewport indexes contiguous after column move', async ({ page }) => {
    const colSize = 80;
    const columns = buildOneChildGroupColumns(40, colSize);

    await mountGrid(page, {
      width: 400,
      height: 260,
      colSize,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
      canMoveColumns: true,
    });

    const headers = page.locator(`${SELECTORS.actualHeaderCells}`);
    const firstHeader = headers.first();
    const fourthHeader = headers.nth(3);
    const fromBox = await firstHeader.boundingBox();
    const toBox = await fourthHeader.boundingBox();

    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();

    await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox!.x + toBox!.width - 4, toBox!.y + toBox!.height / 2, {
      steps: 14,
    });
    await page.mouse.up();
    await page.waitForChanges();

    const visibleIndexes = await getVisibleColumnItemIndexes(page);
    expect(visibleIndexes.length).toBeGreaterThan(0);
    expect(isContiguous(visibleIndexes)).toBe(true);
    await expectCountLessThan(groupHeaderCells(page), 40);
  });

  test('keeps grouped column viewport indexes contiguous after column source trim', async ({ page }) => {
    const colSize = 80;
    const columns = buildOneChildGroupColumns(40, colSize);

    await mountGrid(page, {
      width: 400,
      height: 260,
      colSize,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    await page.evaluate((trimmedColumns: ColumnData) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      grid.columns = trimmedColumns;
    }, columns.filter((_, index) => index !== 2 && index !== 7));
    await page.waitForChanges();

    const visibleIndexes = await getVisibleColumnItemIndexes(page);
    expect(visibleIndexes.length).toBeGreaterThan(0);
    expect(isContiguous(visibleIndexes)).toBe(true);
    await expectCountLessThan(groupHeaderCells(page), 40);
  });

  test('projects grouped header indexes after column trimming while preserving source membership', async ({ page }) => {
    const colSize = 80;
    const columns: ColumnData = [
      {
        name: 'Metrics',
        children: [
          { prop: 'metric_0', name: 'Metric 0', size: colSize },
          { prop: 'metric_1', name: 'Metric 1', size: colSize },
          { prop: 'metric_2', name: 'Metric 2', size: colSize },
          { prop: 'metric_3', name: 'Metric 3', size: colSize },
        ],
      },
      { prop: 'notes', name: 'Notes', size: colSize },
    ];

    await mountGrid(page, {
      width: 420,
      height: 260,
      colSize,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      const state = globalThis as typeof globalThis & {
        __groupProjectionEvents?: Array<{
          name: string;
          indexes: number[];
          allSourceIndexes?: number[];
          start: number;
          end: number;
        }>;
      };
      state.__groupProjectionEvents = [];
      grid.addEventListener('beforegroupheaderrender', (event: Event) => {
        const detail = (event as CustomEvent).detail;
        state.__groupProjectionEvents?.push({
          name: detail.group.name,
          indexes: [...detail.group.indexes],
          allSourceIndexes: detail.group.allSourceIndexes
            ? [...detail.group.allSourceIndexes]
            : undefined,
          start: detail.start,
          end: detail.end,
        });
      });
    });

    await applyColumnTrim(page, { 1: true, 3: true }, 'test-column-trim');

    await expect(groupHeaderCells(page).filter({ hasText: 'Metrics' })).toHaveCount(1);
    await expect(page.locator(SELECTORS.actualHeaderCells).filter({ hasText: 'Metric 0' })).toHaveCount(1);
    await expect(page.locator(SELECTORS.actualHeaderCells).filter({ hasText: 'Metric 1' })).toHaveCount(0);
    await expect(page.locator(SELECTORS.actualHeaderCells).filter({ hasText: 'Metric 2' })).toHaveCount(1);
    await expect(page.locator(SELECTORS.actualHeaderCells).filter({ hasText: 'Metric 3' })).toHaveCount(0);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = globalThis as typeof globalThis & {
            __groupProjectionEvents?: Array<{
              name: string;
              indexes: number[];
              allSourceIndexes?: number[];
              start: number;
              end: number;
            }>;
          };
          return state.__groupProjectionEvents
            ?.filter(event => event.name === 'Metrics')
            .at(-1);
        }),
      )
      .toMatchObject({
        name: 'Metrics',
        indexes: [0, 1],
        allSourceIndexes: [0, 1, 2, 3],
        start: 0,
        end: colSize * 2,
      });
  });

  test('projects multi-level grouped header indexes after trimming nested children', async ({ page }) => {
    const colSize = 70;
    const columns = buildNestedGroupColumns();

    await mountGrid(page, {
      width: 520,
      height: 260,
      colSize,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      const state = globalThis as typeof globalThis & {
        __nestedGroupProjectionEvents?: Array<{
          name: string;
          indexes: number[];
          allSourceIndexes?: number[];
        }>;
      };
      state.__nestedGroupProjectionEvents = [];
      grid.addEventListener('beforegroupheaderrender', (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.group.name === 'Year 0' || detail.group.name === 'Month 00-01') {
          state.__nestedGroupProjectionEvents?.push({
            name: detail.group.name,
            indexes: [...detail.group.indexes],
            allSourceIndexes: detail.group.allSourceIndexes
              ? [...detail.group.allSourceIndexes]
              : undefined,
          });
        }
      });
    });

    await applyColumnTrim(page, { 2: true, 5: true, 9: true }, 'test-nested-column-trim');

    await expect(groupHeaderCells(page).filter({ hasText: 'Year 0' })).toHaveCount(1);
    await expect(groupHeaderCells(page).filter({ hasText: 'Month 00-01' })).toHaveCount(1);

    const projections = await page.evaluate(() => {
      const state = globalThis as typeof globalThis & {
        __nestedGroupProjectionEvents?: Array<{
          name: string;
          indexes: number[];
          allSourceIndexes?: number[];
        }>;
      };
      return state.__nestedGroupProjectionEvents ?? [];
    });
    const year0 = projections.filter(event => event.name === 'Year 0').at(-1);
    const month01 = projections.filter(event => event.name === 'Month 00-01').at(-1);

    expect(year0).toMatchObject({
      name: 'Year 0',
      indexes: Array.from({ length: 9 }, (_, index) => index),
      allSourceIndexes: Array.from({ length: 12 }, (_, index) => index),
    });
    expect(month01).toMatchObject({
      name: 'Month 00-01',
      indexes: [2],
      allSourceIndexes: [2, 3],
    });
  });

  test('projects grouped header indexes after moving another column before the group', async ({ page }) => {
    const colSize = 80;
    const columns: ColumnData = [
      {
        name: 'Metrics',
        children: [
          { prop: 'metric_0', name: 'Metric 0', size: colSize },
          { prop: 'metric_1', name: 'Metric 1', size: colSize },
          { prop: 'metric_2', name: 'Metric 2', size: colSize },
        ],
      },
      { prop: 'notes', name: 'Notes', size: colSize },
    ];

    await mountGrid(page, {
      width: 420,
      height: 260,
      colSize,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
      canMoveColumns: true,
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      const state = globalThis as typeof globalThis & {
        __movedGroupProjectionEvents?: Array<{
          name: string;
          indexes: number[];
          allSourceIndexes?: number[];
        }>;
      };
      state.__movedGroupProjectionEvents = [];
      grid.addEventListener('beforegroupheaderrender', (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.group.name === 'Metrics') {
          state.__movedGroupProjectionEvents?.push({
            name: detail.group.name,
            indexes: [...detail.group.indexes],
            allSourceIndexes: detail.group.allSourceIndexes
              ? [...detail.group.allSourceIndexes]
              : undefined,
          });
        }
      });
    });

    const headers = page.locator(SELECTORS.actualHeaderCells);
    const from = headers.filter({ hasText: 'Notes' });
    const to = headers.filter({ hasText: 'Metric 0' });
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();

    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();

    await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox!.x + 4, toBox!.y + toBox!.height / 2, {
      steps: 14,
    });
    await page.mouse.up();
    await page.waitForChanges();

    await expect.poll(() => visibleHeaderTexts(page)).toEqual([
      'Notes',
      'Metric 0',
      'Metric 1',
      'Metric 2',
    ]);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = globalThis as typeof globalThis & {
            __movedGroupProjectionEvents?: Array<{
              name: string;
              indexes: number[];
              allSourceIndexes?: number[];
            }>;
          };
          return state.__movedGroupProjectionEvents
            ?.filter(event => event.name === 'Metrics')
            .at(-1);
        }),
      )
      .toMatchObject({
        name: 'Metrics',
        indexes: [1, 2, 3],
        allSourceIndexes: [0, 1, 2],
      });
  });

  test('keeps large grouped timelines bounded to the visible group header DOM', async ({ page }) => {
    const days = 365 * 5;
    const metricsPerDay = 3;
    const colSize = 64;
    const columns = buildDailyMetricGroupColumns(days, metricsPerDay, colSize);

    await mountGrid(page, {
      width: 512,
      height: 260,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    const groupCells = groupHeaderCells(page);
    await expect.poll(() => groupCells.count()).toBeGreaterThan(0);
    await expectCountLessThan(groupCells, 20);
    await expect(groupCells.filter({ hasText: 'Day 0000' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 1600' })).toHaveCount(0);

    const initialGroupCellCount = await groupCells.count();

    await scrollToCell(page, colSize * metricsPerDay * 1600, 0);

    await expect(groupCells.filter({ hasText: 'Day 1600' })).toHaveCount(1);
    await expect(groupCells.filter({ hasText: 'Day 0000' })).toHaveCount(0);
    await expectCountLessThan(groupCells, 20);
    expect(Math.abs((await groupCells.count()) - initialGroupCellCount)).toBeLessThanOrEqual(2);
  });

  test('keeps pinned group headers fully rendered because pinned columns are not virtualized', async ({ page }) => {
    const columns: ColumnData = [
      ...Array.from({ length: 3 }, (_, index) => ({
        name: `Pinned ${index}`,
        children: [
          {
            prop: `pinned_${index}`,
            name: `Pinned child ${index}`,
            size: 80,
            pin: 'colPinStart' as const,
          },
        ],
      })),
      ...buildOneChildGroupColumns(40, 80),
    ];

    await mountGrid(page, {
      width: 480,
      height: 260,
      columns,
      source: buildRows(2, flattenLeafProps(columns)),
    });

    const pinnedGroupCells = groupHeaderCells(page, SELECTORS.pinnedStartViewport);
    await expect(pinnedGroupCells).toHaveCount(3);
    await expect(pinnedGroupCells.filter({ hasText: 'Pinned 0' })).toHaveCount(1);
    await expect(pinnedGroupCells.filter({ hasText: 'Pinned 1' })).toHaveCount(1);
    await expect(pinnedGroupCells.filter({ hasText: 'Pinned 2' })).toHaveCount(1);

    await scrollToCell(page, 80 * 20, 0);

    const scrolledPinnedGroupCells = groupHeaderCells(page, SELECTORS.pinnedStartViewport);
    await expect(scrolledPinnedGroupCells).toHaveCount(3);
    await expect(scrolledPinnedGroupCells.filter({ hasText: 'Pinned 0' })).toHaveCount(1);
    await expect(scrolledPinnedGroupCells.filter({ hasText: 'Pinned 1' })).toHaveCount(1);
    await expect(scrolledPinnedGroupCells.filter({ hasText: 'Pinned 2' })).toHaveCount(1);
  });
});

function groupHeaderCells(page: E2EPage, viewport = SELECTORS.mainViewport) {
  return page.locator(`${viewport} revogr-header .group-rgRow > .rgHeaderCell`);
}

async function getVisibleColumnItemIndexes(page: E2EPage): Promise<number[]> {
  const indexes = await page.locator(SELECTORS.actualHeaderCells).evaluateAll(cells =>
    cells.map(cell => Number((cell as HTMLElement).dataset.rgcol)),
  );
  return indexes.filter(Number.isFinite);
}

async function applyColumnTrim(
  page: E2EPage,
  trimmed: Record<number, boolean>,
  trimmedType: string,
) {
  await page.evaluate(({ trimmed, trimmedType }) => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) {
      throw new Error('Grid was not created');
    }
    return grid.getProviders().then((providers) => {
      if (!providers) {
        throw new Error('Grid providers were not created');
      }
      const trimLayer = { [trimmedType]: trimmed };
      providers.column.stores.rgCol.addTrimmed(trimLayer);
      providers.dimension.setTrimmed(trimLayer, 'rgCol');
    });
  }, { trimmed, trimmedType });
  await page.waitForChanges();
}

function isContiguous(indexes: number[]) {
  return indexes.every((index, offset) => offset === 0 || index === indexes[offset - 1] + 1);
}

async function expectCountLessThan(locator: ReturnType<typeof groupHeaderCells>, expected: number) {
  await expect.poll(() => locator.count()).toBeLessThan(expected);
}

function buildOneChildGroupColumns(groupCount: number, size: number): ColumnData {
  return Array.from({ length: groupCount }, (_, index) => {
    const label = String(index).padStart(3, '0');
    return {
      name: `Day ${label}`,
      children: [{ prop: `day_${label}`, name: `Value ${label}`, size }],
    };
  });
}

function buildNestedGroupColumns(): ColumnData {
  return Array.from({ length: 4 }, (_, yearIndex) => ({
    name: `Year ${yearIndex}`,
    children: Array.from({ length: 6 }, (_, monthIndex) => ({
      name: `Month ${String(yearIndex).padStart(2, '0')}-${String(monthIndex).padStart(2, '0')}`,
      children: [
        {
          prop: `value_${yearIndex}_${monthIndex}_0`,
          name: `Value ${yearIndex}-${monthIndex}-0`,
          size: 70,
        },
        {
          prop: `value_${yearIndex}_${monthIndex}_1`,
          name: `Value ${yearIndex}-${monthIndex}-1`,
          size: 70,
        },
      ],
    })),
  }));
}

function buildDailyMetricGroupColumns(days: number, metricsPerDay: number, size: number): ColumnData {
  return Array.from({ length: days }, (_, dayIndex) => {
    const day = String(dayIndex).padStart(4, '0');
    return {
      name: `Day ${day}`,
      children: Array.from({ length: metricsPerDay }, (_, metricIndex) => ({
        prop: `day_${day}_metric_${metricIndex}`,
        name: `Metric ${metricIndex}`,
        size,
      })),
    };
  });
}

function flattenLeafProps(columns: ColumnData): string[] {
  return columns.flatMap(column => {
    if ('children' in column && Array.isArray(column.children)) {
      return flattenLeafProps(column.children);
    }
    return [String(column.prop)];
  });
}
