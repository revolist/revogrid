import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { buildColumns, dataCell, mountGrid } from './helpers';

test.describe('accessibility', () => {
  test('updates pinned row and cell ARIA indices when section lengths change', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      pinnedTopSource: [{ name: 'top' }],
      source: [{ name: 'main' }],
      pinnedBottomSource: [{ name: 'bottom' }],
    });
    const mainRows = page.locator('revogr-data[type="rgRow"] [role="row"]');
    const bottomRows = page.locator(
      'revogr-data[type="rowPinEnd"] [role="row"]',
    );
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '2');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '3');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.pinnedTopSource = [{ name: 'top' }, { name: 'new top' }];
    });
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '3');
    await expect(
      mainRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '3');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '4');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.source = [{ name: 'main' }, { name: 'new main' }];
    });
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '5');
    await expect(
      bottomRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '5');
    await expect(page.locator('revo-grid')).toHaveAttribute(
      'aria-rowcount',
      '5',
    );
  });

  test('uses one-based ARIA indices for data cells', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
      ]),
      source: [{ id: 101, name: 'Alice' }],
    });

    const firstCell = dataCell(page, 0, 0);

    await expect(firstCell).toHaveAttribute('role', 'gridcell');
    await expect(firstCell).toHaveAttribute('aria-colindex', '1');
    await expect(firstCell).toHaveAttribute('aria-rowindex', '1');
  });
});
