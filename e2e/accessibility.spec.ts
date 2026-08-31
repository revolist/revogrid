import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { buildColumns, dataCell, mountGrid } from './helpers';

test.describe('accessibility', () => {
  test('uses one-based ARIA indices for data cells', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
      ]),
      source: [{ id: 101, name: 'Alice' }],
    });

    const firstCell = dataCell(page, 0, 0);

    await expect(firstCell).toHaveAttribute('role', 'gridcell');
    await expect(firstCell).toHaveAttribute('aria-colindex', '1');
    await expect(firstCell).toHaveAttribute('aria-rowindex', '1');
  });
});
