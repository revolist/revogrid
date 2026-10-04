import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { dataCell } from './helpers';

test('does not auto-size a replacement column using the removed column', async ({ page }) => {
  await page.setContent('<revo-grid auto-size-column style="display:block;width:900px;height:200px"></revo-grid>');
  await page.waitForSelector('revo-grid');
  await page.evaluate(() => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
    grid.filter = false;
    grid.columns = [{ prop: 'old', name: 'Old', autoSize: true, size: 40, filter: false }];
    grid.source = [{ old: 'Removed column with long text', current: 'New' }];
  });
  await page.waitForChanges();
  await page.evaluate(() => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
    grid.columns = [{ prop: 'current', name: 'New', autoSize: false, size: 40, filter: false }];
  });
  await page.waitForChanges();
  const cell = dataCell(page, 0, 0);
  await expect(cell).toHaveText('New');
  await page.getByRole('columnheader', { name: 'New', exact: true }).dblclick();
  await page.waitForChanges();
  expect((await cell.boundingBox())?.width).toBe(40);
});
