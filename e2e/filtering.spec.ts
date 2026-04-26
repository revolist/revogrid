import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  expectVisibleColumnValues,
  mainDataRows,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('filtering', () => {
  test('filters rows correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
      { id: 504, name: 'Dan', role: 'Designer', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('filter-header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('filter-header-name') },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('filter-header-role') },
      { prop: 'city', name: 'City', ...withHeaderTestId('filter-header-city') },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    await page
      .getByTestId('filter-header-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Admin');

    await expectVisibleColumnValues(page, 1, ['Alice', 'Cara']);
    await expect(mainDataRows(page)).toHaveCount(2);
    await expect(dataCell(page, 0, 1)).toHaveText('Alice');
    await expect(dataCell(page, 1, 1)).toHaveText('Cara');

    await filterPanel.getByRole('button', { name: 'reset' }).click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);
    await expect(mainDataRows(page)).toHaveCount(4);
  });

  test('reapplies active filters after source replacement', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
      { id: 504, name: 'Dan', role: 'Designer', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('source-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    await page
      .getByTestId('source-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Admin');

    await expectVisibleColumnValues(page, 1, ['Alice', 'Cara']);

    await filterPanel.getByRole('button', { name: 'ok' }).click();
    await expect(filterPanel).not.toBeVisible();

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 601, name: 'Eve', role: 'Admin', city: 'Madrid' },
        { id: 602, name: 'Finn', role: 'Engineer', city: 'Paris' },
        { id: 603, name: 'Gia', role: 'Admin', city: 'Rome' },
      ];
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, ['Eve', 'Gia']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('reapplies programmatic filters after source replacement', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.dispatchEvent(
        new CustomEvent('filter', {
          detail: {
            role: [
              {
                id: 0,
                type: 'contains',
                value: 'Manager',
                relation: 'and',
              },
            ],
          },
        }),
      );
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, []);
    await expect(mainDataRows(page)).toHaveCount(0);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 601, name: 'Eve', role: 'Manager', city: 'Madrid' },
        { id: 602, name: 'Finn', role: 'Engineer', city: 'Paris' },
        { id: 603, name: 'Gia', role: 'Manager', city: 'Rome' },
      ];
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, ['Eve', 'Gia']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });
});
