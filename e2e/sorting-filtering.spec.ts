import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  expectVisibleColumnValues,
  mountGrid,
  withHeaderTestId,
} from './helpers';

test.describe('sorting and filtering', () => {
  test('preserves correct visible order when sorting and filtering are combined', async ({ page }) => {
    const source = [
      { id: 1, name: 'Zed', role: 'Admin', city: 'Lisbon' },
      { id: 2, name: 'Amy', role: 'Admin', city: 'Porto' },
      { id: 3, name: 'Max', role: 'User', city: 'Braga' },
      { id: 4, name: 'Bob', role: 'Admin', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      {
        prop: 'name',
        name: 'Name',
        sortable: true,
        ...withHeaderTestId('combo-sort-name'),
      },
      {
        prop: 'role',
        name: 'Role',
        filter: true,
        ...withHeaderTestId('combo-filter-role'),
      },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
    });

    await page.getByTestId('combo-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Amy', 'Bob', 'Max', 'Zed']);

    await page
      .getByTestId('combo-filter-role')
      .locator(SELECTORS.filterButton)
      .click();
    await page.locator(SELECTORS.filterPanel).getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Admin');

    await expectVisibleColumnValues(page, 1, ['Amy', 'Bob', 'Zed']);

    await page.locator(SELECTORS.filterPanel).getByRole('button', { name: 'reset' }).click();
    await expectVisibleColumnValues(page, 1, ['Amy', 'Bob', 'Max', 'Zed']);

    await page.getByTestId('combo-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Zed', 'Max', 'Bob', 'Amy']);
  });
});
