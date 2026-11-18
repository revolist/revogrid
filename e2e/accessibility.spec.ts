import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  dataCell,
  mountGrid,
  rowHeaderCell,
  SELECTORS,
} from './helpers';

test.describe('accessibility', () => {
  test('owns leaf and grouped column headers in their respective rows', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [
        {
          name: 'People',
          children: [
            {
              name: 'Identity',
              children: [
                { prop: 'id', name: 'ID', pin: 'colPinStart' },
                { prop: 'name', name: 'Name' },
              ],
            },
          ],
        },
      ],
      source: [{ id: 1, name: 'Alice' }],
      rowHeaders: true,
    });

    const header = page
      .locator(SELECTORS.mainViewport)
      .locator('revogr-header');
    const rows = header.getByRole('row');
    await expect(rows).toHaveCount(3);
    for (const pane of [
      SELECTORS.mainViewport,
      SELECTORS.pinnedStartViewport,
    ]) {
      const headers = page
        .locator(pane)
        .locator('revogr-header')
        .getByRole('row');
      for (const index of [1, 2, 3]) {
        await expect(headers.nth(index - 1)).toHaveAttribute(
          'aria-rowindex',
          String(index),
        );
      }
    }
    await expect(page.getByRole('treegrid')).toHaveAttribute(
      'aria-rowcount',
      '4',
    );
    await expect(dataCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '4');
    await expect(
      rows.nth(0).getByRole('columnheader', { name: 'People' }),
    ).toBeVisible();
    await expect(
      rows.nth(1).getByRole('columnheader', { name: 'Identity' }),
    ).toBeVisible();
    await expect(
      rows.nth(2).getByRole('columnheader', { name: 'Name' }),
    ).toBeVisible();
  });

  test('exposes row-number cells as row headers and preserves custom properties', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
      rowHeaders: { size: 60, __cellTestIds: true },
    });

    const cell = rowHeaderCell(page, 0);
    await expect(cell).toHaveAttribute('role', 'rowheader');
    await expect(cell).toHaveAttribute('data-testid', 'row-header-0');
    await expect(
      page
        .locator(SELECTORS.rowHeaderViewport)
        .getByRole('row')
        .getByRole('rowheader', { name: '1', exact: true }),
    ).toBeVisible();
  });

  test('keeps attribution outside the treegrid and reveals it on keyboard focus', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
    });

    const grid = page.locator(SELECTORS.grid);
    const treegrid = grid.getByRole('treegrid');
    const attribution = grid.getByRole('link', { name: 'RevoGrid' });
    await expect(treegrid.getByRole('link', { name: 'RevoGrid' })).toHaveCount(
      0,
    );
    await expect(attribution).toHaveAttribute(
      'href',
      'https://rv-grid.com/guide/attribution',
    );
    await expect(attribution).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(attribution).toBeFocused();
    await expect(attribution).toHaveCSS('opacity', '1');
    await attribution.evaluate(link => {
      link.addEventListener(
        'click',
        event => {
          event.preventDefault();
          link.dataset.activated = String(event.isTrusted);
        },
        { once: true },
      );
    });
    await page.keyboard.press('Enter');
    await expect(attribution).toHaveAttribute('data-activated', 'true');
    await page.keyboard.press('Tab');
    await expect(treegrid).toBeFocused();

    await grid.evaluate(element =>
      element.setAttribute('aria-label', 'People'),
    );
    await expect(treegrid).toHaveAccessibleName('People');

    await grid.evaluate(element => {
      const label = document.createElement('span');
      label.id = 'grid-label';
      label.textContent = 'Team roster';
      element.before(label);
      element.setAttribute('aria-labelledby', label.id);
    });
    await expect(treegrid).toHaveAccessibleName('Team roster');
    await expect(treegrid).toHaveAttribute('aria-colcount', '1');
  });

  test('tabs to overflowing vertical panes and scrolls with the keyboard', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: Array.from({ length: 200 }, (_, index) => ({
        name: `Person ${index}`,
      })),
      rowHeaders: true,
    });

    const grid = page.locator(SELECTORS.grid);
    const rowHeaderPane = page
      .locator(SELECTORS.rowHeaderViewport)
      .locator('.vertical-inner');
    const dataPane = page
      .locator(SELECTORS.mainViewport)
      .locator('.vertical-inner');
    await expect(rowHeaderPane).toHaveAttribute('tabindex', '0');
    await expect(dataPane).toHaveAttribute('tabindex', '0');
    await grid.getByRole('treegrid').focus();
    await page.keyboard.press('Tab');
    await expect(rowHeaderPane).toBeFocused();
    const rowHeaderStart = await rowHeaderPane.evaluate(el => {
      el.addEventListener(
        'scrollend',
        () => {
          el.setAttribute('data-scroll-ended', 'true');
        },
        { once: true },
      );
      return el.scrollTop;
    });
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => rowHeaderPane.evaluate(el => el.scrollTop))
      .toBeGreaterThan(rowHeaderStart);
    await expect(rowHeaderPane).toHaveAttribute('data-scroll-ended', 'true');
    await page.keyboard.press('Tab');
    await expect(dataPane).toBeFocused();
    const dataStart = await dataPane.evaluate(el => el.scrollTop);
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => dataPane.evaluate(el => el.scrollTop))
      .toBeGreaterThan(dataStart);

    await page.evaluate(() => {
      document.querySelector('revo-grid')!.source = [{ name: 'Alice' }];
    });
    await expect(dataPane).not.toHaveAttribute('tabindex');
    await expect(rowHeaderPane).not.toHaveAttribute('tabindex');
  });

  test('omits accessibility roles and pane tab stops when accessibility is disabled', async ({
    page,
  }) => {
    await mountGrid(page, {
      accessible: false,
      columns: [
        {
          name: 'People',
          children: [{ prop: 'name', name: 'Name' }],
        },
      ],
      source: Array.from({ length: 200 }, () => ({ name: 'Alice' })),
      rowHeaders: true,
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).not.toHaveAttribute('role');
    await expect(grid.locator('[role]')).toHaveCount(0);
    await expect(grid.locator('.vertical-inner[tabindex]')).toHaveCount(0);
  });

  test('updates pinned row and cell ARIA indices when section lengths change', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      pinnedTopSource: [{ name: 'top' }],
      source: [{ name: 'main' }],
      pinnedBottomSource: [{ name: 'bottom' }],
    });
    const mainRows = page.locator('revogr-data[type="rgRow"] [role="row"]');
    const bottomRows = page.locator(
      'revogr-data[type="rowPinEnd"] [role="row"]',
    );
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '3');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '4');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.pinnedTopSource = [{ name: 'top' }, { name: 'new top' }];
    });
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '4');
    await expect(
      mainRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '4');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '5');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.source = [{ name: 'main' }, { name: 'new main' }];
    });
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '6');
    await expect(
      bottomRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '6');
    await expect(page.getByRole('treegrid')).toHaveAttribute(
      'aria-rowcount',
      '6',
    );
  });

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
    await expect(firstCell).toHaveAttribute('aria-rowindex', '2');
  });
});
