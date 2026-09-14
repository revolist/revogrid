import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  callGridMethod,
  dataCell,
  expectFocusedCell,
  expectSelectedRange,
  getSelectedRange,
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
    await expectSelectedRange(page, { x: 0, y: 0, x1: 0, y1: 0 });

    await page.keyboard.press('ArrowRight');
    await expectFocusedCell(page, { x: 1, y: 0 });
    await expectSelectedRange(page, { x: 1, y: 0, x1: 1, y1: 0 });

    await page.keyboard.press('ArrowDown');
    await expectFocusedCell(page, { x: 1, y: 1 });
    await expectSelectedRange(page, { x: 1, y: 1, x1: 1, y1: 1 });

    await page.keyboard.press('Shift+ArrowDown');
    await expectFocusedCell(page, { x: 1, y: 1 });
    await expectSelectedRange(page, { x: 1, y: 1, x1: 1, y1: 2 });

    await page.keyboard.press('ArrowRight');
    await expectFocusedCell(page, { x: 2, y: 1 });
    await expectSelectedRange(page, { x: 2, y: 1, x1: 2, y1: 1 });

    await page.keyboard.press('Tab');
    await expectFocusedCell(page, { x: 3, y: 1 });
    await expectSelectedRange(page, { x: 3, y: 1, x1: 3, y1: 1 });

    await page.keyboard.press('Shift+Tab');
    await expectFocusedCell(page, { x: 2, y: 1 });
    await expectSelectedRange(page, { x: 2, y: 1, x1: 2, y1: 1 });
  });

  test('moves focus to every virtualized logical edge with Ctrl or Cmd arrows', async ({ page }) => {
    const columns = Array.from({ length: 24 }, (_, index) => ({
      name: `Column ${index}`,
      prop: `column${index}`,
      size: 120,
    }));
    await mountGrid(page, {
      columns,
      source: Array.from({ length: 80 }, (_, row) => Object.fromEntries(
        columns.map((column, columnIndex) => [column.prop, `${row}-${columnIndex}`]),
      )),
      range: true,
      width: 370,
      height: 180,
    });

    await setCellsFocus(page, { x: 5, y: 10 });
    await page.keyboard.press('Control+ArrowRight');
    await expectFocusedCell(page, { x: 23, y: 10 });
    await expect.poll(() => dataCell(page, 10, 23).isVisible()).toBe(true);

    await page.keyboard.press('Control+ArrowLeft');
    await expectFocusedCell(page, { x: 0, y: 10 });
    await expect.poll(() => dataCell(page, 10, 0).isVisible()).toBe(true);

    await page.keyboard.press('Meta+ArrowDown');
    await expectFocusedCell(page, { x: 0, y: 79 });
    await expect.poll(() => dataCell(page, 79, 0).isVisible()).toBe(true);

    await page.keyboard.press('Meta+ArrowUp');
    await expectFocusedCell(page, { x: 0, y: 0 });
    await expect.poll(() => dataCell(page, 0, 0).isVisible()).toBe(true);

    await page.keyboard.press('Control+ArrowUp');
    await expectFocusedCell(page, { x: 0, y: 0 });
  });

  test('extends ranges to every logical edge while preserving the other axis', async ({ page }) => {
    const columns = Array.from({ length: 8 }, (_, index) => ({
      name: `Column ${index}`,
      prop: `column${index}`,
    }));
    await mountGrid(page, {
      columns,
      source: Array.from({ length: 20 }, (_, row) => Object.fromEntries(
        columns.map((column, columnIndex) => [column.prop, `${row}-${columnIndex}`]),
      )),
      range: true,
    });

    await setCellsFocus(page, { x: 3, y: 7 });
    await page.keyboard.press('Control+Shift+ArrowDown');
    await expectFocusedCell(page, { x: 3, y: 7 });
    await expectSelectedRange(page, { x: 3, y: 7, x1: 3, y1: 19 });

    await page.keyboard.press('Control+Shift+ArrowRight');
    await expectSelectedRange(page, { x: 3, y: 7, x1: 7, y1: 19 });

    await setCellsFocus(page, { x: 3, y: 7 });
    await page.keyboard.press('Meta+Shift+ArrowUp');
    await expectSelectedRange(page, { x: 3, y: 0, x1: 3, y1: 7 });

    await page.keyboard.press('Meta+Shift+ArrowLeft');
    await expectSelectedRange(page, { x: 0, y: 0, x1: 3, y1: 7 });
  });

  test('moves focus without creating a range when range selection is disabled', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: Array.from({ length: 10 }, (_, index) => ({
        id: index,
        name: `Name ${index}`,
        role: `Role ${index}`,
        city: `City ${index}`,
      })),
      trimmedRows: { 1: true, 7: true },
      range: false,
    });

    await setCellsFocus(page, { x: 1, y: 1 });
    await page.keyboard.press('Control+Shift+ArrowDown');
    await expectFocusedCell(page, { x: 1, y: 7 });
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 1,
      y: 7,
      x1: 1,
      y1: 7,
    });
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
