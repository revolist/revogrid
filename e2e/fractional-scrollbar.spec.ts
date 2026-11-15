import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { buildRows, mountGrid } from './helpers';

for (const deviceScaleFactor of [1.25, 1.5]) {
  test.describe(`fractional scrollbars at DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });

    for (const zoom of [1, 1.25, 1.5]) {
      test(`fitting content has no native scroll range at zoom ${zoom}`, async ({ page }) => {
        await mountGrid(page, {
          columns: [{ prop: 'id', size: 100 }, { prop: 'name', size: 100 }],
          source: buildRows(2, ['id', 'name']),
          width: 620,
          height: 360,
          rowSize: 30,
        }, `body { margin: 0; } body > div { zoom: ${zoom}; } revo-grid { box-sizing: border-box; border: 1px solid gray; }`);

        const bars = page.locator('revogr-scroll-virtual');
        const nativeRanges = () => bars.evaluateAll(elements => elements.map(el => {
          const property = el.classList.contains('vertical') ? 'scrollTop' : 'scrollLeft';
          el[property] = 1_000_000;
          const range = el[property];
          el[property] = 0;
          return range;
        }));
        // clientWidth/scrollWidth are rounded and can match despite a real
        // fractional range. Probe the native offset instead.
        await expect(bars).toHaveCount(2);
        await expect.poll(nativeRanges).toEqual([0, 0]);

        await page.evaluate(() => {
          const container = document.querySelector('revo-grid')!.parentElement!;
          container.style.width = '620.2px';
          container.style.height = '360.667px';
        });
        await page.waitForChanges();
        await expect.poll(nativeRanges).toEqual([0, 0]);

        // Real overflow must still work after transitioning out of the fit case.
        await page.evaluate(() => {
          const grid = document.querySelector('revo-grid')!;
          grid.columns = [{ prop: 'id', size: 700 }, { prop: 'name', size: 700 }];
          grid.source = Array.from({ length: 100 }, (_, id) => ({ id, name: `Row ${id}` }));
        });
        await expect.poll(async () => (await nativeRanges()).every(range => range > 100)).toBe(true);

        // A native boundary scroll should settle rather than repeatedly echo.
        const virtualEvents = await page.spyOnEvent('scrollvirtual');
        const viewportEvents = await page.spyOnEvent('scrollviewport');
        await page.evaluate(() => {
          const grid = document.querySelector('revo-grid')!;
          for (const bar of grid.querySelectorAll('revogr-scroll-virtual')) {
            bar[bar.classList.contains('vertical') ? 'scrollTop' : 'scrollLeft'] = 1_000_000;
          }
        });
        await page.waitForTimeout(200);
        const eventCount = () => virtualEvents.length + viewportEvents.length;
        const settled = eventCount();
        expect(settled).toBeGreaterThan(0);
        await page.waitForTimeout(200);
        expect(eventCount()).toBe(settled);
      });
    }
  });
}
