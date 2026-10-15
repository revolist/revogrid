import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { basicColumns, dataCell, mountGrid, pinnedBottomCell, pinnedTopCell } from './helpers';

test('ARIA totals and pinned offsets follow represented rows after trim and untrim', async ({ page }) => {
  await mountGrid(page, {
    columns: basicColumns(['name']),
    source: [{ name: 'hidden' }, { name: 'visible' }, { name: 'last' }],
    pinnedTopSource: [{ name: 'top' }], pinnedBottomSource: [{ name: 'bottom' }],
    trimmedRows: { 0: true },
  });
  const grid = page.locator('revo-grid');
  await expect(grid).toHaveAttribute('aria-rowcount', '4');
  await expect(pinnedTopCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '1');
  await expect(dataCell(page, 0, 0)).toHaveText('visible');
  await expect(dataCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '2');
  await expect(dataCell(page, 1, 0)).toHaveAttribute('aria-rowindex', '3');
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '4');
  await page.evaluate(() => { (document.querySelector('revo-grid') as any).trimmedRows = {}; });
  await page.waitForChanges();
  await expect(grid).toHaveAttribute('aria-rowcount', '5');
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '5');
  await page.evaluate(() => { (document.querySelector('revo-grid') as any).trimmedRows = { 0: true, 1: true, 2: true }; });
  await page.waitForChanges();
  await expect(grid).toHaveAttribute('aria-rowcount', '2');
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '2');
});
