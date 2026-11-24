import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid } from './helpers';

test('collapsed group editor keeps pinned and regular rows aligned', async ({
  page,
}) => {
  await mountGrid(
    page,
    {
      height: 500,
      theme: 'compact',
      rowSize: 32,
      columns: [
        { prop: 'team', name: 'Name', pin: 'colPinStart', size: 260 },
        { prop: 'total', name: 'Total', pin: 'colPinStart', size: 120 },
        { prop: 'jan', name: 'Jan', size: 120 },
        { prop: 'feb', name: 'Feb', size: 120 },
      ],
      source: [
        { team: 'Administrator', total: 2, jan: 2, feb: 0 },
        { team: 'Administrator', total: 12, jan: 8, feb: 4 },
        { team: 'Administrator', total: 14, jan: 10, feb: 4 },
        { team: 'Weekend', total: 10, jan: 4, feb: 6 },
      ],
      pinnedBottomSource: [
        { team: 'Add resource' },
        { team: 'Total', total: 24, jan: 14, feb: 10 },
      ],
    },
    'revogr-edit input { border: 1px solid #ccc; min-height: 34px; }',
  );

  await page.evaluate(() => {
    const grid = document.querySelector('revo-grid')!;
    grid.grouping = {
      props: ['team'],
      expandedAll: true,
      groupCellTemplate(h, cell) {
        if (cell.group.isLabelColumn) {
          return h('button', { onClick: cell.group.onExpand }, cell.group.name);
        }
        return h(
          'span',
          {},
          cell.group.name === 'Weekend'
            ? cell.prop === 'feb'
              ? '6'
              : '4'
            : '2',
        );
      },
    };
  });
  await page.waitForChanges();
  await page.getByRole('button', { name: 'Weekend' }).click();
  const periodRows = page.locator(
    'revogr-data[type="rgRow"][col-type="rgCol"] .rgRow',
  );
  await periodRows.last().locator('.rgCell').last().dblclick();
  await expect(page.locator('revogr-edit input')).toBeVisible();
  const result = await page.locator('revo-grid').evaluate(grid => {
    const tops = (column: string) =>
      Array.from(
        grid.querySelectorAll(
          `revogr-data[type="rgRow"][col-type="${column}"] .rgRow`,
        ),
        row => row.getBoundingClientRect().top,
      );
    return {
      pinned: tops('colPinStart'),
      periods: tops('rgCol'),
      scrolls: Array.from(
        grid.querySelectorAll('.content-wrapper'),
        element => element.scrollTop,
      ),
    };
  });
  expect(result.scrolls).toEqual([0, 0]);
  expect(result.periods).toEqual(result.pinned);
});
