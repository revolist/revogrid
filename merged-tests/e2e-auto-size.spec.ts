import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { dataCell } from './helpers';

for (const [value, width] of [[0, 37], [false, 65]] as const) {
  test(`auto-sizes ${value} after a header double click`, async ({ page }) => {
    await page.setContent('<revo-grid auto-size-column style="display:block;width:900px;height:200px"></revo-grid>');
    await page.waitForSelector('revo-grid');
    await page.evaluate(cellValue => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
      grid.filter = false;
      grid.columns = [{ prop: 'value', name: 'V', autoSize: true, size: 30, filter: false }];
      grid.source = [{ value: cellValue }];
    }, value);
    await page.waitForChanges();
    await expect(dataCell(page, 0, 0)).toHaveText(String(value));
    await page.getByText('V', { exact: true }).dblclick();
    await expect.poll(async () => (await dataCell(page, 0, 0).boundingBox())?.width).toBe(width);
  });
}

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
