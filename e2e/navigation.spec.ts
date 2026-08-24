import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  callGridMethod,
  dataCell,
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

  test('keeps the focused cell visible during held ArrowRight navigation', async ({ page }) => {
    const columns = Array.from({ length: 30 }, (_, index) => ({
      name: `Column ${index}`,
      prop: `column${index}`,
      size: 120,
    }));
    const source = [Object.fromEntries(
      columns.map((column, index) => [column.prop, `Value ${index}`]),
    )];

    await mountGrid(page, {
      columns,
      source,
      width: 370,
      height: 180,
    });
    await setCellsFocus(page, { x: 0, y: 0 });

    const expectFocusedColumnVisible = async (expectedColumn: number) => {
      await expect.poll(async () => {
        const focused = await callGridMethod<{
          cell?: { x?: number };
        } | null>(page, 'getFocused');
        return focused?.cell?.x;
      }).toBe(expectedColumn);

      const focusedCell = dataCell(page, 0, expectedColumn);
      await expect.poll(async () => {
        if (!await focusedCell.isVisible()) {
          return false;
        }
        return focusedCell.evaluate((cell) => {
          const viewport = cell.closest<HTMLElement>('revogr-viewport-scroll');
          if (!viewport) {
            return false;
          }
          const viewportRect = viewport.getBoundingClientRect();
          const cellRect = cell.getBoundingClientRect();
          return (
            cellRect.right > viewportRect.left &&
            cellRect.left < viewportRect.right
          );
        });
      }, {
        message: `focused column ${expectedColumn} did not enter the viewport`,
      }).toBe(true);
    };

    await expectFocusedColumnVisible(0);
    let expectedColumn = 0;
    for (const burstSize of [8, 8, 8, 5]) {
      await page.evaluate((repeatCount) => {
        for (let keyIndex = 0; keyIndex < repeatCount; keyIndex += 1) {
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            code: 'ArrowRight',
            bubbles: true,
            cancelable: true,
            repeat: keyIndex > 0,
          }));
        }
      }, burstSize);
      expectedColumn += burstSize;
      await expectFocusedColumnVisible(expectedColumn);
    }
  });
});
