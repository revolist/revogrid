import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  mainDataRows,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('rendering', () => {
  test('renders grid with expected dimensions', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 101, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 102, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 103, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('header-name') },
      { prop: 'role', name: 'Role', ...withHeaderTestId('header-role') },
      { prop: 'city', name: 'City', ...withHeaderTestId('header-city') },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.locator(SELECTORS.grid)).toBeVisible();
    await expect(page.locator(SELECTORS.actualHeaderCells)).toHaveCount(
      columns.length,
    );
    await expect(mainDataRows(page)).toHaveCount(source.length);
  });
});
