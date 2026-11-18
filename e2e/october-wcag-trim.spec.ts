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
  const grid = page.getByRole('treegrid');
  const ownedRowTypes = () => grid.evaluate(element =>
    (element.getAttribute('aria-owns') ?? '').split(' ').filter(Boolean).map(id =>
      element.ownerDocument.getElementById(id)?.getAttribute('type'),
    ),
  );
  await expect(grid).toHaveAttribute('aria-rowcount', '5');
  await expect.poll(ownedRowTypes).toEqual(['rowPinStart', 'rgRow', 'rowPinEnd']);
  await expect(pinnedTopCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '2');
  await expect(dataCell(page, 0, 0)).toHaveText('visible');
  await expect(dataCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '3');
  await expect(dataCell(page, 1, 0)).toHaveAttribute('aria-rowindex', '4');
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '5');
  await page.evaluate(() => { (document.querySelector('revo-grid') as any).trimmedRows = {}; });
  await page.waitForChanges();
  await expect(grid).toHaveAttribute('aria-rowcount', '6');
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '6');
  await page.evaluate(() => { (document.querySelector('revo-grid') as any).trimmedRows = { 0: true, 1: true, 2: true }; });
  await page.waitForChanges();
  await expect(grid).toHaveAttribute('aria-rowcount', '3');
  await expect.poll(ownedRowTypes).toEqual(['rowPinStart', 'rowPinEnd']);
  await expect(pinnedBottomCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '3');
});
