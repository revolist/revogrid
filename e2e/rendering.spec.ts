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

  test('keeps unchanged header cells stable when columns are replaced', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 101, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 102, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('header-name') },
      { prop: 'role', name: 'Role', ...withHeaderTestId('header-role') },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.locator(SELECTORS.actualHeaderCells)).toHaveCount(3);
    await page.evaluate((headerSelector: string) => {
      const headers = Array.from(document.querySelectorAll(headerSelector));
      const nameHeader = headers.find(
        header => header.textContent?.trim() === 'Name',
      );
      const roleHeader = headers.find(
        header => header.textContent?.trim() === 'Role',
      );
      if (!nameHeader || !roleHeader) {
        throw new Error('Expected initial headers to be rendered');
      }
      (window as any).__stableHeaders = { nameHeader, roleHeader };
    }, SELECTORS.actualHeaderCells);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      const helpers = (globalThis as any).__revoGridE2EHelpers;
      if (!grid || !helpers) {
        throw new Error('Grid or E2E helpers were not found');
      }
      grid.columns = [
        {
          prop: 'name',
          name: 'Name',
          columnProperties: helpers.toColumnProperties('header-name'),
        },
        {
          prop: 'role',
          name: 'Role',
          columnProperties: helpers.toColumnProperties('header-role'),
        },
        {
          prop: 'city',
          name: 'City',
          columnProperties: helpers.toColumnProperties('header-city'),
        },
      ];
    });
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.actualHeaderCells)).toHaveCount(3);
    await expect(page.locator(SELECTORS.actualHeaderCells)).toContainText([
      'Name',
      'Role',
      'City',
    ]);
    await expect
      .poll(() => page.locator(SELECTORS.actualHeaderCells).allTextContents())
      .toEqual(['Name', 'Role', 'City']);
    await expect(
      page.evaluate((headerSelector: string) => {
        const stable = (window as any).__stableHeaders;
        const headers = Array.from(document.querySelectorAll(headerSelector));
        const nameHeader = headers.find(
          header => header.textContent?.trim() === 'Name',
        );
        const roleHeader = headers.find(
          header => header.textContent?.trim() === 'Role',
        );
        return {
          namePreserved: stable.nameHeader === nameHeader,
          rolePreserved: stable.roleHeader === roleHeader,
        };
      }, SELECTORS.actualHeaderCells),
    ).resolves.toEqual({ namePreserved: true, rolePreserved: true });
  });

  test('keeps duplicate-prop header cells distinct when columns are replaced', async ({ page }) => {
    const source = [
      { name: 'Alice', role: 'Engineer' },
      { name: 'Ben', role: 'Designer' },
    ];

    const columns = buildColumns([
      { prop: 'name', name: 'First Name', ...withHeaderTestId('first-name') },
      { prop: 'name', name: 'Second Name', ...withHeaderTestId('second-name') },
      { prop: 'role', name: 'Role', ...withHeaderTestId('role') },
    ]);

    await mountGrid(page, { columns, source });

    await expect(page.locator(SELECTORS.actualHeaderCells)).toHaveCount(3);
    await expect(page.locator(SELECTORS.actualHeaderCells)).toContainText([
      'First Name',
      'Second Name',
      'Role',
    ]);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      const helpers = (globalThis as any).__revoGridE2EHelpers;
      if (!grid || !helpers) {
        throw new Error('Grid or E2E helpers were not found');
      }
      grid.columns = [
        {
          prop: 'name',
          name: 'Second Name Updated',
          columnProperties: helpers.toColumnProperties('second-name-updated'),
        },
        {
          prop: 'name',
          name: 'First Name Updated',
          columnProperties: helpers.toColumnProperties('first-name-updated'),
        },
        {
          prop: 'role',
          name: 'Role',
          columnProperties: helpers.toColumnProperties('role'),
        },
      ];
    });
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.actualHeaderCells)).toContainText([
      'Second Name Updated',
      'First Name Updated',
      'Role',
    ]);
    await expect(page.getByTestId('second-name-updated')).toHaveText(
      /Second Name Updated/,
    );
    await expect(page.getByTestId('first-name-updated')).toHaveText(
      /First Name Updated/,
    );
  });
});
