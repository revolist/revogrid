import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  expectFocusedCell,
  mountGrid,
  setCellsFocus,
  withHeaderTestId,
} from './helpers';

test.describe('layout', () => {
  test('resizes a column and keeps header and cell widths aligned', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name', size: 120, ...withHeaderTestId('resize-name') },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
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
      { steps: 8 },
    );
    await page.mouse.up();

    await expect(resizeHandle).toBeVisible();
    const afterHeaderBox = await header.boundingBox();
    const afterCellBox = await dataCell(page, 0, 1).boundingBox();

    expect(afterHeaderBox!.width).toBeGreaterThan(beforeHeaderBox!.width + 20);
    expect(Math.abs(afterHeaderBox!.width - afterCellBox!.width)).toBeLessThan(2);
  });

  test('supports theme switching and rtl layout without breaking focus rendering', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
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
