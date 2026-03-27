import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildRows,
  mountGrid,
  pinnedBottomCell,
  pinnedEndCell,
  pinnedStartCell,
  pinnedTopCell,
  scrollToCell,
  visibleColumnValues,
} from './helpers';

test.describe('pinning', () => {
  test('keeps pinned rows and pinned columns visible while scrolling', async ({ page }) => {
    const rowSize = 30;
    const source = buildRows(30, ['left', 'name', 'middle', 'right']).map((row, index) => ({
      left: `Left ${index + 1}`,
      name: `Name ${index + 1}`,
      middle: `Middle ${index + 1}`,
      right: `Right ${index + 1}`,
    }));

    const columns = [
      { prop: 'left', name: 'Left', pin: 'colPinStart' as const, size: 120 },
      { prop: 'name', name: 'Name', size: 120 },
      { prop: 'middle', name: 'Middle', size: 120 },
      { prop: 'right', name: 'Right', pin: 'colPinEnd' as const, size: 120 },
    ];

    await mountGrid(page, {
      columns,
      source,
      pinnedTopSource: [{ left: 'Pinned Top', name: 'Top', middle: 'Pinned', right: 'Top Right' }],
      pinnedBottomSource: [{ left: 'Pinned Bottom', name: 'Bottom', middle: 'Pinned', right: 'Bottom Right' }],
      width: 420,
      height: 320,
      rowSize,
      colSize: 120,
    });

    await scrollToCell(page, 240, rowSize * 20);

    await expect(page.locator(SELECTORS.pinnedStartViewport)).toBeVisible();
    await expect(page.locator(SELECTORS.pinnedEndViewport)).toBeVisible();
    await expect(pinnedStartCell(page, 20, 0)).toHaveText('Left 21');
    await expect(pinnedEndCell(page, 20, 0)).toHaveText('Right 21');
    await expect(pinnedTopCell(page, 0, 0)).toHaveText('Top');
    await expect(pinnedBottomCell(page, 0, 0)).toHaveText('Bottom');

    const visibleMiddleValues = await visibleColumnValues(page, 1);
    expect(visibleMiddleValues.some(value => value === 'Middle 21')).toBe(true);
  });
});
