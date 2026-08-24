import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  SAMPLE_ROWS,
  basicColumns,
  buildRows,
  callGridMethod,
  dataCell,
  dispatchClipboardEvent,
  expectSelectedRange,
  mountGrid,
  setCellsFocus,
} from './helpers';

test.describe('range selection', () => {
  test('applies pasted values across the selected range', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await expectSelectedRange(page, { x: 1, y: 0, x1: 2, y1: 1 });

    await dispatchClipboardEvent(page, 'paste', 'Alpha\tBeta\nGamma\tDelta');

    await expect(dataCell(page, 0, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 0, 2)).toHaveText('Beta');
    await expect(dataCell(page, 1, 1)).toHaveText('Gamma');
    await expect(dataCell(page, 1, 2)).toHaveText('Delta');
  });

  test('fills the selected range with a single pasted value when enabled', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
      useClipboard: { rangeFill: true },
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await expectSelectedRange(page, { x: 1, y: 0, x1: 2, y1: 1 });

    await dispatchClipboardEvent(page, 'paste', 'Alpha');

    await expect(dataCell(page, 0, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 0, 2)).toHaveText('Alpha');
    await expect(dataCell(page, 1, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 1, 2)).toHaveText('Alpha');
  });

  test('fills the selected range when a single pasted value has a trailing row delimiter', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
      useClipboard: { rangeFill: true },
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await dispatchClipboardEvent(page, 'paste', 'Alpha\n');

    await expect(dataCell(page, 0, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 0, 2)).toHaveText('Alpha');
    await expect(dataCell(page, 1, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 1, 2)).toHaveText('Alpha');
  });

  test('preserves trailing empty pasted cells when range fill is enabled', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
      useClipboard: { rangeFill: true },
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await dispatchClipboardEvent(page, 'paste', 'Beta\t');

    await expect(dataCell(page, 0, 1)).toHaveText('Beta');
    await expect(dataCell(page, 0, 2)).toHaveText('');
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
    await expect(dataCell(page, 1, 2)).toHaveText('Designer');
  });

  test('keeps single pasted values focused-cell only by default', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.trio,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await expectSelectedRange(page, { x: 1, y: 0, x1: 2, y1: 1 });

    await dispatchClipboardEvent(page, 'paste', 'Alpha');

    await expect(dataCell(page, 0, 1)).toHaveText('Alpha');
    await expect(dataCell(page, 0, 2)).toHaveText('Engineer');
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
    await expect(dataCell(page, 1, 2)).toHaveText('Designer');
  });

  test('keeps keyboard range selection inside the grid at the last row', async ({
    page,
  }) => {
    const rows = buildRows(80);
    const lastRowIndex = rows.length - 1;

    await mountGrid(page, {
      columns: basicColumns(),
      source: rows,
      range: true,
      height: 260,
    });

    await callGridMethod(page, 'scrollToRow', lastRowIndex);
    await expect(dataCell(page, lastRowIndex, 0)).toBeVisible();
    await setCellsFocus(page, { x: 0, y: lastRowIndex });
    await expectSelectedRange(page, {
      x: 0,
      y: lastRowIndex,
      x1: 0,
      y1: lastRowIndex,
    });

    await page.keyboard.press('Shift+ArrowDown');

    await expectSelectedRange(page, {
      x: 0,
      y: lastRowIndex,
      x1: 0,
      y1: lastRowIndex,
    });

    const viewportBox = await page.locator(SELECTORS.mainViewport).boundingBox();
    const rangeBox = await page.locator(SELECTORS.selectedRange).boundingBox();

    expect(viewportBox).not.toBeNull();
    expect(rangeBox).not.toBeNull();
    expect(rangeBox!.y + rangeBox!.height).toBeLessThanOrEqual(
      viewportBox!.y + viewportBox!.height,
    );

    await page.keyboard.press('Shift+ArrowUp');
    await expectSelectedRange(page, {
      x: 0,
      y: lastRowIndex - 1,
      x1: 0,
      y1: lastRowIndex,
    });

    await page.keyboard.press('Shift+ArrowDown');
    await expectSelectedRange(page, {
      x: 0,
      y: lastRowIndex,
      x1: 0,
      y1: lastRowIndex,
    });
  });

  test('keeps select-all range and focus coherent across virtual scrolling', async ({
    page,
  }) => {
    const rows = buildRows(120);
    const targetRow = 60;

    await mountGrid(page, {
      columns: basicColumns(),
      source: rows,
      range: true,
      height: 260,
    });

    await setCellsFocus(page, { x: 1, y: 4 });
    await page.keyboard.press('Meta+A');
    await page.waitForChanges();

    await expectSelectedRange(page, {
      x: 0,
      y: 0,
      x1: 3,
      y1: rows.length - 1,
    });
    await expect.poll(() => callGridMethod(page, 'getFocused')).toMatchObject({
      cell: { x: 1, y: 4 },
    });
    await expect(page.locator(SELECTORS.selectedRange)).toHaveCount(1);

    await callGridMethod(page, 'scrollToRow', targetRow);
    await expect(dataCell(page, targetRow, 0)).toBeVisible();
    const scrolledFocusBox = await page
      .locator(SELECTORS.focusedCell)
      .boundingBox();
    const viewportBox = await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .boundingBox();
    expect(scrolledFocusBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    expect(scrolledFocusBox!.y + scrolledFocusBox!.height).toBeLessThanOrEqual(
      viewportBox!.y + 1,
    );
    await expectSelectedRange(page, {
      x: 0,
      y: 0,
      x1: 3,
      y1: rows.length - 1,
    });
    await expect(dataCell(page, targetRow, 0).locator('..')).toHaveClass(
      /focused-rgRow/,
    );

    await setCellsFocus(page, { x: 2, y: targetRow });
    await expectSelectedRange(page, {
      x: 2,
      y: targetRow,
      x1: 2,
      y1: targetRow,
    });

    const cellBox = await dataCell(page, targetRow, 2).boundingBox();
    const focusBox = await page.locator(SELECTORS.focusedCell).boundingBox();
    expect(cellBox).not.toBeNull();
    expect(focusBox).not.toBeNull();
    expect(Math.abs(cellBox!.x - focusBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(cellBox!.y - focusBox!.y)).toBeLessThanOrEqual(2);
  });
});
