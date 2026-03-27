import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  expectVisibleColumnValues,
  getVisibleSource,
  mountGrid,
} from './helpers';

test.describe('trimming', () => {
  test('hides trimmed rows and restores them when trimming clears', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
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
