import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildRows,
  dataCell,
  mainDataRows,
  mountGrid,
  scrollToCell,
  visibleColumnValues,
} from './helpers';

test.describe('virtualization', () => {
  test('renders only the visible window and reveals later rows on scroll', async ({ page }) => {
    const rowSize = 30;
    const source = buildRows(200, ['id', 'name', 'role', 'city']);
    const columns = [
      { prop: 'id', name: 'ID', size: 100 },
      { prop: 'name', name: 'Name', size: 140 },
      { prop: 'role', name: 'Role', size: 140 },
      { prop: 'city', name: 'City', size: 140 },
    ];

    await mountGrid(page, {
      columns,
      source,
      height: 260,
      rowSize,
    });

    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);
    const initialRowCount = await mainDataRows(page).count();
    expect(initialRowCount).toBeGreaterThan(0);
    expect(initialRowCount).toBeLessThan(source.length);

    await scrollToCell(page, 0, rowSize * 150);
    await expect(dataCell(page, 150, 1)).toHaveText('Name 151');

    const visibleNames = await visibleColumnValues(page, 1);
    expect(new Set(visibleNames).size).toBe(visibleNames.length);
    expect(visibleNames.includes('Name 151')).toBe(true);
  });
});
