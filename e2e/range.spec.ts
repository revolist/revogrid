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

  test('fills the selected range when a single pasted value has trailing delimiters', async ({
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

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await dispatchClipboardEvent(page, 'paste', 'Beta\t');

    await expect(dataCell(page, 0, 1)).toHaveText('Beta');
    await expect(dataCell(page, 0, 2)).toHaveText('Beta');
    await expect(dataCell(page, 1, 1)).toHaveText('Beta');
    await expect(dataCell(page, 1, 2)).toHaveText('Beta');
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
});
