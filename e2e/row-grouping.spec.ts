import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  expectVisibleColumnValues,
  mainDataRows,
  mountGrid,
  withHeaderTestId,
} from './helpers';

test.describe('row grouping', () => {
  test('renders grouped rows and toggles expansion', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    const northGroupToggle = mainGroupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton);

    await expect(mainGroupRows).toContainText(['North', 'South']);
    await expect(mainGroupRows).toHaveCount(2);
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    await northGroupToggle.click();
    await expectVisibleColumnValues(page, 1, ['Cara', 'Dan']);

    await northGroupToggle.click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);
  });

  test('filters collapsed grouped rows and keeps only matching branches visible', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('group-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: false,
      },
      rowHeaders: true,
    });

    await expect(mainDataRows(page)).toHaveCount(2);

    await page
      .getByTestId('group-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expect(mainGroupRows).toHaveCount(1);
    await expect(mainGroupRows).toContainText(['South']);
    await expect(mainDataRows(page)).toHaveCount(1);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = {
        ...(grid.grouping as Record<string, unknown>),
        expandedAll: true,
      };
    });

    await expectVisibleColumnValues(page, 1, ['Cara']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });
});
