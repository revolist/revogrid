import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import type { ExportFilePlugin } from '../src/plugins/export/export.plugin';
import {
  SAMPLE_ROWS,
  basicColumns,
  getExportCsv,
  mountGrid,
} from './helpers';

test.describe('export', () => {
  test('cancels file download before export and still allows a later download', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(), source: SAMPLE_ROWS.pair, exporting: true,
    });
    const clicks = await page.evaluate(async () => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
      let downloadClicks = 0;
      grid.addEventListener('click', event => {
        if ((event.target as HTMLElement).tagName === 'A') downloadClicks++;
      }, true);
      grid.addEventListener('beforeexport', event => event.preventDefault(), { once: true });
      const plugin = (await grid.getPlugins()).find(plugin => 'exportFile' in plugin) as ExportFilePlugin;
      await plugin.exportFile({ filename: 'cancelled' });
      return downloadClicks;
    });
    expect(clicks).toBe(0);
    expect(await page.locator('revo-grid a[download]').count()).toBe(0);

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(async () => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
      const plugin = (await grid.getPlugins()).find(plugin => 'exportFile' in plugin) as ExportFilePlugin;
      await plugin.exportFile({ filename: 'allowed' });
    });
    expect((await downloadPromise).suggestedFilename()).toBe('allowed.csv');
  });

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
