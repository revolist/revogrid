import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import type { E2EPage } from '@stencil/playwright';
import type { ColumnData } from '../src';
import {
  buildColumns,
  buildRows,
  expectChildHeaderUnderGroup,
  mountGrid,
  scrollToCell,
  SELECTORS,
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
