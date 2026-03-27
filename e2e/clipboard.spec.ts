import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  getCopiedText,
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
});
