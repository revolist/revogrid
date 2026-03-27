import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  expectVisibleColumnValues,
  getVisibleSource,
  mountGrid,
} from './helpers';

test.describe('trimming', () => {
  test('hides trimmed rows and restores them when trimming clears', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.quartet,
      trimmedRows: { 1: true, 3: true },
    });

    await expectVisibleColumnValues(page, 1, ['Alice', 'Cara']);
    await expect.poll(() => getVisibleSource(page).then(rows => rows.length)).toBe(2);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid not found');
      }
      grid.trimmedRows = {};
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);
    await expect.poll(() => getVisibleSource(page).then(rows => rows.length)).toBe(4);
  });
});
