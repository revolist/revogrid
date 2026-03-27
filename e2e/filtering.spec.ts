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
});
