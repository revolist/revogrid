import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid } from './helpers';

test('external viewport-slot scrollbars retain their supplied panel size', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'id', size: 1000 }],
    source: [{ id: 0 }],
    width: 400,
    height: 240,
  });
  await page.evaluate(() => {
    const scroll = document.createElement('revogr-scroll-virtual');
    scroll.id = 'panel-scroll';
    scroll.slot = 'viewport';
    scroll.className = 'horizontal';
    scroll.dimension = 'rgCol';
    scroll.realSize = 1800;
    scroll.clientSize = 700;
    scroll.virtualSize = 700;
    scroll.style.cssText = 'position:absolute;bottom:0;width:700px;height:20px;';
    document.querySelector('revo-grid')!.appendChild(scroll);
  });
  const scroll = page.locator('#panel-scroll');
  for (const width of [700, 300, 1900]) {
    await scroll.evaluate((el: HTMLRevogrScrollVirtualElement, width) => {
      el.clientSize = width;
      el.virtualSize = width;
      el.style.width = `${width}px`;
    }, width);
    await expect.poll(() => scroll.evaluate(el => el.scrollWidth - el.clientWidth))
      .toBe(Math.max(0, 1800 - width));
  }
});

for (const area of ['header', 'footer']) {
  test(`updates the scrollbar before paint when only the ${area} height changes`, async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'id', size: 200 }],
      source: Array.from({ length: 6 }, (_, id) => ({ id })),
      rowSize: 30,
      width: 400,
      height: 240,
    });
    await page.addStyleTag({ content: `
      revo-grid { min-height: 0; }
      revo-grid .header-rgRow { display: none; }
      revo-grid .${area}-wrapper { height: 100px; flex-shrink: 0; }
    ` });
    const scrollbar = page.locator('revogr-scroll-virtual.vertical');
    await expect.poll(() => scrollbar.evaluate(el => el.scrollHeight - el.clientHeight)).toBe(40);

    for (const height of [40, 100, 40, 100]) {
      const samples = await page.evaluate(async ({ area, height }) => {
        const grid = document.querySelector('revo-grid')!;
        const viewport = grid.querySelector('revogr-viewport-scroll.rgCol')!;
        const wrapper = viewport.querySelector(`.inner-content-table > .${area}-wrapper`) as HTMLElement;
        const scroll = grid.querySelector('revogr-scroll-virtual.vertical')!;
        const samples: { overflow: number; available: number }[] = [];
        wrapper.style.height = `${height}px`;
        const start = performance.now();
        await new Promise<void>(resolve => {
          // Read after ResizeObserver delivery/layout, as in the host-resize regressions.
          const sample = () => setTimeout(() => {
            samples.push({
              overflow: scroll.scrollHeight - scroll.clientHeight,
              available: viewport.clientHeight - wrapper.clientHeight,
            });
            if (performance.now() - start < 100) requestAnimationFrame(sample);
            else resolve();
          }, 0);
          requestAnimationFrame(sample);
        });
        return samples;
      }, { area, height });
      expect(samples.length).toBeGreaterThan(2);
      for (const sample of samples) {
        expect(sample.available).toBe(240 - height);
        expect(sample.overflow, JSON.stringify(samples)).toBe(Math.max(0, 180 - sample.available));
      }
    }
  });
}

test('does not flash a scrollbar when source and grid height grow together', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'id', size: 400 }],
    source: [{ id: 0 }],
    rowSize: 47,
    rowDefinitions: [{ type: 'rgRow', index: 0, size: 46 }],
    height: 46,
    width: 600,
  });
  await page.addStyleTag({ content: 'revo-grid { min-height: 0; } revo-grid .header-rgRow { display: none !important; }' });
  await page.waitForChanges();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const grid = document.querySelector('revo-grid')!;
    const button = document.createElement('button');
    button.textContent = 'Add row';
    button.onclick = () => {
      const count = grid.source.length === 1 ? 2 : 1;
      const samples: number[] = [];
      (window as typeof window & { resizeOverflow: number[] }).resizeOverflow = samples;
      const start = performance.now();
      // Sample after ResizeObserver delivery/paint, rather than inside the
      // animation callback that runs before the browser finishes layout.
      const sample = () => setTimeout(() => {
        const scroll = grid.querySelector('revogr-scroll-virtual.vertical')!;
        if (grid.querySelectorAll('revogr-data[type="rgRow"] .rgRow').length === count) {
          samples.push(scroll.scrollHeight - scroll.clientHeight);
        }
        if (performance.now() - start < 250) requestAnimationFrame(sample);
      }, 0);
      requestAnimationFrame(sample);
      grid.source = Array.from({ length: count }, (_, id) => ({ id }));
      grid.rowDefinitions = [{ type: 'rgRow', index: count - 1, size: 46 }];
      grid.parentElement!.style.height = `${count * 47 - 1}px`;
    };
    document.body.prepend(button);
  });
  for (let change = 0; change < 4; change++) {
    await page.getByRole('button', { name: 'Add row' }).click();
    await page.waitForTimeout(350);
    const samples = await page.evaluate(() =>
      (window as typeof window & { resizeOverflow: number[] }).resizeOverflow);
    expect(samples.length).toBeGreaterThan(2);
    expect(Math.max(...samples), JSON.stringify(samples)).toBe(0);
  }
});

test('does not flash a scrollbar when columns and grid width resize together', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'a', size: 200 }],
    source: [{ a: 'A', b: 'B' }],
    width: 200,
    height: 200,
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const grid = document.querySelector('revo-grid')!;
    const button = document.createElement('button');
    button.textContent = 'Resize columns';
    button.onclick = () => {
      const grow = grid.columns.length === 1;
      const count = grow ? 2 : 1;
      const samples: number[] = [];
      (window as typeof window & { resizeOverflow: number[] }).resizeOverflow = samples;
      const start = performance.now();
      // Sample after ResizeObserver delivery/paint, rather than inside the
      // animation callback that runs before the browser finishes layout.
      const sample = () => setTimeout(() => {
        const scroll = grid.querySelector('revogr-scroll-virtual.horizontal')!;
        if (grid.querySelectorAll('revogr-header .actual-rgRow .rgHeaderCell').length === count) {
          samples.push(scroll.scrollWidth - scroll.clientWidth);
        }
        if (performance.now() - start < 250) requestAnimationFrame(sample);
      }, 0);
      requestAnimationFrame(sample);
      grid.columns = grow
        ? [{ prop: 'a', size: 200 }, { prop: 'b', size: 200 }]
        : [{ prop: 'a', size: 200 }];
      grid.parentElement!.style.width = grow ? '400px' : '200px';
    };
    document.body.prepend(button);
  });
  for (let change = 0; change < 4; change++) {
    await page.getByRole('button', { name: 'Resize columns' }).click();
    await page.waitForTimeout(350);
    const samples = await page.evaluate(() =>
      (window as typeof window & { resizeOverflow: number[] }).resizeOverflow);
    expect(samples.length).toBeGreaterThan(2);
    expect(Math.max(...samples), JSON.stringify(samples)).toBe(0);
  }
});
