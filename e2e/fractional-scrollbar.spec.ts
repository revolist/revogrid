import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { buildRows, mountGrid } from './helpers';

for (const deviceScaleFactor of [1.25, 1.5]) {
  test.describe(`fractional scrollbars at DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });

    for (const axis of ['vertical', 'horizontal'] as const) {
      test(`does not write back to a fractional native ${axis} scrollbar position`, async ({ page }) => {
        await mountGrid(page, {
          columns: [{ prop: 'id', size: 700 }, { prop: 'name', size: 700 }],
          source: buildRows(100, ['id', 'name']),
          width: 620,
          height: 360,
          rowSize: 30,
        }, `body > div { zoom: ${deviceScaleFactor}; }`);

        const virtualEvents = await page.spyOnEvent('scrollvirtual');
        const bar = page.locator(`revogr-scroll-virtual.${axis}`);
        const nativePosition = await bar.evaluate((element, axis) => {
          const property = axis === 'vertical' ? 'scrollTop' : 'scrollLeft';
          const native = Object.getOwnPropertyDescriptor(Element.prototype, property)!;
          element[property] = 101;
          let writes = 0;
          Object.defineProperty(element, property, {
            get: () => native.get!.call(element),
            set: (value: number) => {
              element.dataset.echoWrites = String(++writes);
              native.set!.call(element, value);
            },
          });
          element.dataset.echoWrites = '0';
          return element[property];
        }, axis);
        expect(nativePosition).toBeGreaterThan(100);
        expect(nativePosition).not.toBe(Math.round(nativePosition));

        const dimension = axis === 'vertical' ? 'rgRow' : 'rgCol';
        await expect.poll(() => virtualEvents.events.some(event =>
          event.detail.dimension === dimension &&
          event.detail.coordinate === nativePosition,
        )).toBe(true);

        const viewport = axis === 'vertical'
          ? page.locator('revogr-viewport-scroll.rgCol .vertical-inner').first()
          : page.locator('revogr-viewport-scroll.rgCol');
        await expect.poll(() => viewport.evaluate((element, axis) =>
          axis === 'vertical' ? element.scrollTop : element.scrollLeft, axis,
        )).toBeGreaterThan(100);
        await page.waitForChanges();
        await expect(bar).toHaveAttribute('data-echo-writes', '0');
      });
    }

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
