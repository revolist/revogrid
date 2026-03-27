import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  dataCell,
  dispatchClipboardEvent,
  expectSelectedRange,
  mountGrid,
  setCellsFocus,
  buildColumns,
  type SampleRow,
} from './helpers';

test.describe('range selection', () => {
  test('applies pasted values across the selected range', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
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
