import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SAMPLE_ROWS,
  basicColumns,
  getExportCsv,
  mountGrid,
} from './helpers';

test.describe('export', () => {
  test('exports the visible grid data as csv', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(),
      source: SAMPLE_ROWS.pair,
      exporting: true,
    });

    const csv = await getExportCsv(page);
    expect(csv).toContain('\uFEFF');
    expect(csv).toContain('"ID","Name","Role","City"');
    expect(csv).toContain('1,Alice,Engineer,Lisbon');
    expect(csv).toContain('2,Ben,Designer,Porto');
  });
});
