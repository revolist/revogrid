import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  expectFocusedCell,
  mountGrid,
  setCellsFocus,
} from './helpers';

test.describe('navigation', () => {
  test('moves focus with arrow keys and tab navigation', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
    });

    await setCellsFocus(page, { x: 0, y: 0 });
    await expectFocusedCell(page, { x: 0, y: 0 });

    await page.keyboard.press('ArrowRight');
    await expectFocusedCell(page, { x: 1, y: 0 });

    await page.keyboard.press('ArrowDown');
    await expectFocusedCell(page, { x: 1, y: 1 });

    await page.keyboard.press('Tab');
    await expectFocusedCell(page, { x: 2, y: 1 });

    await page.keyboard.press('Shift+Tab');
    await expectFocusedCell(page, { x: 1, y: 1 });
  });
});
