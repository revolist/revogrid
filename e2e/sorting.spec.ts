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

  test('sorts NaN before finite numeric values', async ({ page }) => {
    const source: SampleRow[] = [
      { id: Number.NaN, name: 'Invalid', role: 'Engineer', city: 'Porto' },
      { id: 9, name: 'Nine', role: 'Designer', city: 'Lisbon' },
      { id: 2, name: 'Two', role: 'Manager', city: 'Braga' },
    ];
    const columns = buildColumns([
      {
        prop: 'id',
        name: 'ID',
        sortable: true,
        ...withHeaderTestId('sort-header-id-nan'),
      },
    ]);

    await mountGrid(page, { columns, source });
    await expectVisibleColumnValues(page, 0, ['NaN', '9', '2']);

    await page.getByTestId('sort-header-id-nan').click();
    await expectVisibleColumnValues(page, 0, ['NaN', '2', '9']);
  });
});
