import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  SELECTORS,
  basicColumns,
  buildColumns,
  buildRows,
  dataCell,
  expectFocusedCell,
  mountGrid,
  setCellsFocus,
  withHeaderTestId,
} from './helpers';

test.describe('layout', () => {
  test('initializes the regular viewport when every column has an explicit size', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'account', size: 138 },
        { prop: 'region', size: 92 },
        { prop: 'revenue', size: 112 },
        { prop: 'growth', size: 90 },
      ]),
      source: [
        {
          account: 'Northstar Labs',
          region: 'EMEA',
          revenue: '$184,200',
          growth: '+18.4%',
        },
      ],
      width: 440,
      colSize: 100,
    });

    await expect(page.locator(SELECTORS.actualHeaderCells)).toHaveCount(4);
    await expect(dataCell(page, 0, 0)).toHaveText('Northstar Labs');
  });

  test('contains horizontal overscroll within the grid viewport', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns(
        Array.from({ length: 10 }, (_, index) => ({
          prop: `col${index}`,
          size: 120,
        })),
      ),
      source: buildRows(2, Array.from({ length: 10 }, (_, index) => `col${index}`)),
      width: 420,
      height: 240,
      colSize: 120,
    });

    const overscrollBehaviorX = await page
      .locator(SELECTORS.mainViewport)
      .evaluate(element => getComputedStyle(element).overscrollBehaviorX);

    expect(overscrollBehaviorX).toBe('contain');
  });

  test('reverses columns when rtl is enabled before initial connection', async ({
    page,
  }) => {
    await page.setContent(
      '<div id="grid-host" style="width:900px;height:360px"></div>',
    );
    await page.evaluate(() => {
      const grid = document.createElement('revo-grid');
      grid.rtl = true;
      grid.columns = [
        { prop: 'a', name: 'A (first)' },
        { prop: 'b', name: 'B' },
        { prop: 'c', name: 'C (last)' },
      ];
      grid.source = [{ a: 1, b: 2, c: 3 }];
      grid.style.cssText = 'display:block;width:100%;height:100%';
      document.querySelector('#grid-host')!.append(grid);
    });
    await page.waitForChanges();

    const headers = page.locator(SELECTORS.actualHeaderCells);
    await expect(headers).toHaveCount(3);
    await expect(headers).toHaveText(['C (last)', 'B', 'A (first)']);
    await expect(page.locator(SELECTORS.grid)).toHaveAttribute('dir', 'rtl');
  });

  test('does not render inactive header sort or resize affordances', async ({ page }) => {
    const columns = [
      { prop: 'id', name: 'ID', ...withHeaderTestId('inactive-header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('inactive-header-name') },
      {
        prop: 'role',
        name: 'Role',
        order: 'asc',
        ...withHeaderTestId('ordered-header-role'),
      },
    ];

    await mountGrid(page, {
      columns,
      source: SAMPLE_ROWS.pair,
      resize: false,
    });

    const inactiveHeader = page.getByTestId('inactive-header-name');
    await expect(inactiveHeader.locator('.sort-indicator')).toHaveCount(0);
    await expect(inactiveHeader.locator('.sort-off')).toHaveCount(0);
    await expect(inactiveHeader.locator('.no-resize')).toHaveCount(0);
    await expect(inactiveHeader.locator('.resizable')).toHaveCount(0);

    const orderedHeader = page.getByTestId('ordered-header-role');
    await expect(orderedHeader.locator('.sort-indicator')).toHaveCount(1);
    await expect(orderedHeader.locator('.sort-indicator .asc')).toHaveCount(1);
    await expect(orderedHeader.locator('.sort-off')).toHaveCount(0);
    await expect(orderedHeader.locator('.no-resize')).toHaveCount(0);

    await mountGrid(page, {
      columns: [
        {
          prop: 'id',
          name: 'ID',
          sortable: true,
          ...withHeaderTestId('active-header-id'),
        },
      ],
      source: SAMPLE_ROWS.pair,
      resize: true,
    });

    const activeHeader = page.getByTestId('active-header-id');
    await expect(activeHeader.locator('.sort-indicator')).toHaveCount(1);
    await expect(activeHeader.locator('.sort-off')).toHaveCount(1);
    await expect(activeHeader.locator('.resizable-r')).toHaveCount(1);
    await expect(activeHeader.locator('.no-resize')).toHaveCount(0);
  });

  for (const theme of ['default', 'compact', 'material']) {
    for (const rtl of [false, true]) {
      test(`keeps sorting controls outside the label in ${theme} (${rtl ? 'rtl' : 'ltr'})`, async ({
        page,
      }) => {
        await mountGrid(page, {
          columns: [
            {
              prop: 'id',
              name: '🎰 Ticker',
              size: 100,
              sortable: true,
              order: 'asc',
              ...withHeaderTestId('sorted-ticker'),
            },
            {
              prop: 'name',
              name: 'Company Name',
              size: 180,
              sortable: true,
              order: 'asc',
            },
          ],
          source: SAMPLE_ROWS.pair,
          theme,
          rtl,
          resize: true,
        });
        const header = page.getByTestId('sorted-ticker');
        const assertSeparated = async () => {
          await expect
            .poll(() =>
              header.evaluate(element => {
                const label = element
                  .querySelector('.header-content')!
                  .getBoundingClientRect();
                const controls = element
                  .querySelector('.header-controls')!
                  .getBoundingClientRect();
                return (
                  Math.min(label.right, controls.right) -
                  Math.max(label.left, controls.left)
                );
              }),
            )
            .toBeLessThanOrEqual(0);
          await expect(header.locator('.sort-indicator i')).toBeVisible();
        };
        await assertSeparated();
        await expect(header.locator('.sort-order-index')).toHaveText('1');
        await page.evaluate(() => {
          document.querySelector('revo-grid')!.filter = true;
        });
        await page.waitForChanges();
        await header.hover();
        await expect(header.locator('.rv-filter')).toHaveCSS('width', '24px');
        await assertSeparated();
        await header.locator('.header-content').click();
        await expect(header.locator('.sort-indicator .desc')).toHaveCount(1);
        await assertSeparated();
      });
    }
  }

  test('resizes a column and keeps header and cell widths aligned', async ({ page }) => {
    const columns = [
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name', size: 120, ...withHeaderTestId('resize-name') },
      { prop: 'role', name: 'Role' },
    ];

    await mountGrid(page, {
      columns,
      source: SAMPLE_ROWS.pair,
      resize: true,
    });

    const header = page.getByTestId('resize-name');
    const resizeHandle = header.locator('.resizable-r');
    const beforeHeaderBox = await header.boundingBox();
    const beforeCellBox = await dataCell(page, 0, 1).boundingBox();
    const handleBox = await resizeHandle.boundingBox();

    expect(beforeHeaderBox).not.toBeNull();
    expect(beforeCellBox).not.toBeNull();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 40,
      handleBox!.y + handleBox!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();
    await page.waitForChanges();

    await expect(resizeHandle).toBeVisible();
    const afterHeaderBox = await header.boundingBox();
    const afterCellBox = await dataCell(page, 0, 1).boundingBox();

    expect(afterHeaderBox!.width).toBeGreaterThan(beforeHeaderBox!.width + 20);
    expect(Math.abs(afterHeaderBox!.width - afterCellBox!.width)).toBeLessThan(2);
  });

  test('supports theme switching and rtl layout without breaking focus rendering', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      rtl: true,
      theme: 'compact',
      range: true,
    });

    await expect(page.locator(SELECTORS.grid)).toHaveAttribute('theme', 'compact');
    await expect(page.locator(SELECTORS.grid)).toHaveAttribute('dir', 'rtl');

    await setCellsFocus(page, { x: 1, y: 1 });
    await expectFocusedCell(page, { x: 1, y: 1 });
  });
});
