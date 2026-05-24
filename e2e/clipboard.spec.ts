import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  SAMPLE_ROWS,
  basicColumns,
  dataCell,
  dispatchClipboardEvent,
  getCopiedText,
  getCutText,
  getFirefoxCopiedText,
  getSelectedRange,
  mountGrid,
  setCellsFocus,
} from './helpers';

test.describe('clipboard', () => {
  test('copies the selected range as tabular text', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);
    const copiedText = await getCopiedText(page);
    await expect(copiedText).toBe('Alice\tEngineer\nBen\tDesigner');
  });

  test('copies the focused cell as tabular text without starting edit', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Control+C');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    const copiedText = await getCopiedText(page);
    await expect(copiedText).toBe('Alice');
  });

  test('prevents the copy event before writing clipboard data', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    const copiedText = await getFirefoxCopiedText(page);
    await expect(copiedText).toBe('Alice\tEngineer\nBen\tDesigner');
  });

  test('pastes tabular data into the focused cell from keyboard paste flow', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.trio,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 1 });
    await page.keyboard.press('Control+V');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    await dispatchClipboardEvent(page, 'paste', 'Nia\tQA\nOla\tPM');

    await expect(dataCell(page, 1, 1)).toHaveText('Nia');
    await expect(dataCell(page, 1, 2)).toHaveText('QA');
    await expect(dataCell(page, 2, 1)).toHaveText('Ola');
    await expect(dataCell(page, 2, 2)).toHaveText('PM');
  });

  test('cuts the selected range as tabular text and clears the source cells', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'KeyX',
          key: 'x',
          ctrlKey: true,
        }),
      );
    });
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    const cutText = await getCutText(page);

    await expect(cutText).toBe('Alice\tEngineer\nBen\tDesigner');
    await expect(dataCell(page, 0, 1)).toHaveText('');
    await expect(dataCell(page, 0, 2)).toHaveText('');
    await expect(dataCell(page, 1, 1)).toHaveText('');
    await expect(dataCell(page, 1, 2)).toHaveText('');
  });

  test('clears focused and ranged cells with keyboard clear keys', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Backspace');
    await page.waitForChanges();
    await expect(dataCell(page, 0, 1)).toHaveText('');

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.keyboard.press('Delete');
    await page.waitForChanges();

    await expect(dataCell(page, 0, 1)).toHaveText('');
    await expect(dataCell(page, 0, 2)).toHaveText('');
    await expect(dataCell(page, 1, 1)).toHaveText('');
    await expect(dataCell(page, 1, 2)).toHaveText('');
  });

  test('selects the full grid range from keyboard select all', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Control+A');
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: 0,
      x1: 2,
      y1: 1,
    });
  });
});
