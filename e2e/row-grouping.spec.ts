import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  expectVisibleColumnValues,
  mainDataRows,
  mountGrid,
  visibleColumnValues,
  withHeaderTestId,
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

  test('filters collapsed grouped rows and keeps only matching branches visible', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('group-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: false,
      },
      rowHeaders: true,
    });

    await expect(mainDataRows(page)).toHaveCount(2);

    await page
      .getByTestId('group-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expect(mainGroupRows).toHaveCount(1);
    await expect(mainGroupRows).toContainText(['South']);
    await expect(mainDataRows(page)).toHaveCount(1);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = {
        ...(grid.grouping as Record<string, unknown>),
        expandedAll: true,
      };
    });

    await expectVisibleColumnValues(page, 1, ['Cara']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('keeps filter trims mapped when grouping is cleared', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('clear-grouping-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await page
      .getByTestId('clear-grouping-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    await expectVisibleColumnValues(page, 1, ['Cara']);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = { props: [] };
    });
    await page.waitForChanges();

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toHaveCount(0);
    await expectVisibleColumnValues(page, 1, ['Cara']);
    await expect(mainDataRows(page)).toHaveCount(1);
  });

  test('recalculates filtered group rows against freshly updated source', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('source-update-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await page
      .getByTestId('source-update-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText(['South']);
    await expectVisibleColumnValues(page, 1, ['Cara']);

    await filterPanel.getByRole('button', { name: 'ok' }).click();
    await expect(filterPanel).not.toBeVisible();

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 5, name: 'Eve', role: 'Manager', city: 'Madrid', team: 'West' },
        { id: 6, name: 'Finn', role: 'Designer', city: 'Paris', team: 'East' },
      ];
    });
    await page.waitForChanges();

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText(['West']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).not.toContainText(['South']);
    await expectVisibleColumnValues(page, 1, ['Eve']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('sorts data rows and reapplies grouping', async ({ page }) => {
    const source = [
      { id: 1, name: 'Charlie', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Alice', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
      { id: 4, name: 'Ben', role: 'Manager', city: 'Braga', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      {
        prop: 'name',
        name: 'Name',
        sortable: true,
        ...withHeaderTestId('group-sort-name'),
      },
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

    await expectVisibleColumnValues(page, 1, ['Charlie', 'Alice', 'Dan', 'Ben']);

    await page.getByTestId('group-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Charlie', 'Ben', 'Dan']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'North',
      'South',
    ]);

    await page.getByTestId('group-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Dan', 'Ben', 'Charlie', 'Alice']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'South',
      'North',
    ]);
  });

  test('allows row reordering inside a group and blocks dragging across groups', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name', rowDrag: true },
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

    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    const benDragHandle = mainDataRows(page).nth(2).locator('[data-rgCol="1"] .revo-draggable');
    const aliceRow = mainDataRows(page).nth(1);
    const benHandleBox = await benDragHandle.boundingBox();
    const aliceRowBox = await aliceRow.boundingBox();

    expect(benHandleBox).not.toBeNull();
    expect(aliceRowBox).not.toBeNull();

    await page.mouse.move(
      benHandleBox!.x + benHandleBox!.width / 2,
      benHandleBox!.y + benHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      aliceRowBox!.x + aliceRowBox!.width / 2,
      aliceRowBox!.y - 20,
      { steps: 12 },
    );
    await page.mouse.up();

    await expectVisibleColumnValues(page, 1, ['Ben', 'Alice', 'Cara', 'Dan']);

    const aliceDragHandle = mainDataRows(page).nth(2).locator('[data-rgCol="1"] .revo-draggable');
    const caraRow = mainDataRows(page).nth(4);
    const aliceHandleBox = await aliceDragHandle.boundingBox();
    const caraRowBox = await caraRow.boundingBox();

    expect(aliceHandleBox).not.toBeNull();
    expect(caraRowBox).not.toBeNull();

    await page.mouse.move(
      aliceHandleBox!.x + aliceHandleBox!.width / 2,
      aliceHandleBox!.y + aliceHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      caraRowBox!.x + caraRowBox!.width / 2,
      caraRowBox!.y + caraRowBox!.height + 20,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(() => visibleColumnValues(page, 1))
      .toEqual(['Ben', 'Alice', 'Cara', 'Dan']);
  });
});
