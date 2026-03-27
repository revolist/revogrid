import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  expectChildHeaderUnderGroup,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('column groups', () => {
  test('renders column groups correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 401, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 402, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      {
        name: 'Identity',
        ...withHeaderTestId('group-identity'),
        children: [
          { prop: 'id', name: 'ID', ...withHeaderTestId('child-id') },
          { prop: 'name', name: 'Name', ...withHeaderTestId('child-name') },
        ],
      },
      {
        name: 'Details',
        ...withHeaderTestId('group-details'),
        children: [
          { prop: 'role', name: 'Role', ...withHeaderTestId('child-role') },
          { prop: 'city', name: 'City', ...withHeaderTestId('child-city') },
        ],
      },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.getByTestId('group-identity')).toBeVisible();
    await expect(page.getByTestId('group-details')).toBeVisible();
    await expect(page.getByTestId('child-id')).toBeVisible();
    await expect(page.getByTestId('child-name')).toBeVisible();
    await expect(page.getByTestId('child-role')).toBeVisible();
    await expect(page.getByTestId('child-city')).toBeVisible();

    await expectChildHeaderUnderGroup(page, 'child-id', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-name', 'group-identity');
    await expectChildHeaderUnderGroup(page, 'child-role', 'group-details');
    await expectChildHeaderUnderGroup(page, 'child-city', 'group-details');
  });
});
