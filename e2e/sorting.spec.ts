import { test } from '@stencil/playwright';
import {
  buildColumns,
  expectVisibleColumnValues,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('sorting', () => {
  test('sorts rows correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 301, name: 'Charlie', role: 'Engineer', city: 'Porto' },
      { id: 302, name: 'Alice', role: 'Designer', city: 'Lisbon' },
      { id: 303, name: 'Bob', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('sort-header-id') },
      {
        prop: 'name',
        name: 'Name',
        sortable: true,
        ...withHeaderTestId('sort-header-name'),
      },
      { prop: 'role', name: 'Role', ...withHeaderTestId('sort-header-role') },
    ]);

    await mountGrid(page, { columns, source });

    await expectVisibleColumnValues(page, 1, ['Charlie', 'Alice', 'Bob']);

    await page.getByTestId('sort-header-name').click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Bob', 'Charlie']);

    await page.getByTestId('sort-header-name').click();
    await expectVisibleColumnValues(page, 1, ['Charlie', 'Bob', 'Alice']);
  });
});
