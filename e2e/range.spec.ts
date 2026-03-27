import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
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
});
