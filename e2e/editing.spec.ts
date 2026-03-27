import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  cancelEditCellValue,
  dataCell,
  editCellValue,
  mountGrid,
  type SampleRow,
} from './helpers';

test.describe('editing', () => {
  test('commits edits and cancels Escape changes', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await editCellValue(page, 0, 'name', 'Alicia');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('Alicia');

    await cancelEditCellValue(page, 1, 'name', 'Benny');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
  });
});
