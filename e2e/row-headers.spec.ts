import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  mountGrid,
  rowHeaderCell,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('row headers', () => {
  test('renders row headers correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 601, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 602, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 603, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('row-header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('row-header-name') },
      { prop: 'role', name: 'Role', ...withHeaderTestId('row-header-role') },
    ]);

    await mountGrid(page, {
      columns,
      source,
      rowHeaders: { size: 60, __cellTestIds: true },
    });

    await expect(page.locator(SELECTORS.rowHeaderViewport)).toBeVisible();
    await expect(page.getByTestId('row-header-0')).toBeVisible();
    await expect(page.getByTestId('row-header-1')).toBeVisible();
    await expect(page.getByTestId('row-header-2')).toBeVisible();

    await expect(page.getByTestId('row-header-0')).toHaveText('1');
    await expect(page.getByTestId('row-header-1')).toHaveText('2');
    await expect(page.getByTestId('row-header-2')).toHaveText('3');

    await expect(rowHeaderCell(page, 0)).toHaveText('1');
    await expect(rowHeaderCell(page, 1)).toHaveText('2');
    await expect(rowHeaderCell(page, 2)).toHaveText('3');
    await expect(dataCell(page, 0, 1)).toHaveText('Alice');
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
    await expect(dataCell(page, 2, 1)).toHaveText('Cara');
  });
});
