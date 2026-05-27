import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  SELECTORS,
  basicColumns,
  dataCell,
  expectFocusedCell,
  mountGrid,
  setCellsFocus,
  withHeaderTestId,
} from './helpers';

test.describe('layout', () => {
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
