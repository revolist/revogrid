import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  expectVisibleColumnValues,
  mountGrid,
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
});
