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

test('main scrollbar ignores a nested grid in the preceding pinned viewport', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'pinned', pin: 'colPinStart', size: 150 }, { prop: 'id', size: 1000 }],
    source: [{ id: 0 }], width: 400, height: 240,
  });
  await page.evaluate(async () => {
    const outer = document.querySelector('revo-grid')!;
    const inner = document.createElement('revo-grid');
    inner.slot = 'content';
    inner.style.cssText = 'width:150px;height:100px;';
    inner.columns = [{ prop: 'id', size: 500 }];
    inner.source = [{ id: 1 }];
    outer.querySelector('revogr-viewport-scroll.colPinStart')!.appendChild(inner);
    await inner.componentOnReady();
  });
  await expect(page.locator('revo-grid revo-grid revogr-viewport-scroll.rgCol')).toBeVisible();
  await page.locator('revo-grid').first().evaluate((grid: HTMLElement) => { grid.style.width = '410px'; });
  await expect.poll(() => page.locator('revo-grid').first().evaluate(grid => {
    const scroll = grid.querySelector<HTMLElement>(':scope > revogr-scroll-virtual.horizontal')!;
    const viewport = grid.querySelector<HTMLElement>(':scope > .main-viewport > .viewports > revogr-viewport-scroll.rgCol')!;
    return { range: scroll.scrollWidth - scroll.clientWidth, viewport: viewport.scrollWidth - viewport.clientWidth };
  })).toEqual({ range: 740, viewport: 740 });
});

for (const dimension of ['rgCol', 'rgRow'] as const) {
  test(`wrapped external ${dimension} scrollbar retains its supplied viewport size`, async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'id', size: 1000 }], source: [{ id: 0 }], width: 400, height: 240,
    });
    await page.evaluate((dimension) => {
      const wrapper = document.createElement('div');
      wrapper.slot = 'viewport';
      wrapper.style.cssText = 'position:absolute;left:0;top:0;width:700px;height:500px;';
      const scroll = document.createElement('revogr-scroll-virtual');
      scroll.id = 'wrapped-scroll';
      scroll.className = dimension === 'rgCol' ? 'horizontal' : 'vertical';
      scroll.dimension = dimension;
      scroll.realSize = 1800;
      scroll.clientSize = 700;
      scroll.virtualSize = 700;
      scroll.style.cssText = dimension === 'rgCol' ? 'width:700px;height:20px;' : 'height:700px;width:20px;';
      wrapper.appendChild(scroll);
      document.querySelector('revo-grid')!.appendChild(wrapper);
    }, dimension);
    await expect.poll(() => page.locator('#wrapped-scroll').evaluate((el, dimension) =>
      dimension === 'rgCol' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight,
    dimension)).toBe(1100);
  });
}

test('reconnected built-in scrollbar still observes header height changes', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'id', size: 200 }],
    source: Array.from({ length: 20 }, (_, id) => ({ id })), rowSize: 30, width: 400, height: 240,
  });
  await page.addStyleTag({ content: 'revo-grid { min-height:0; } revo-grid .header-rgRow { display:none; } revo-grid .header-wrapper { height:40px; flex-shrink:0; }' });
  const scroll = page.locator('revogr-scroll-virtual.vertical');
  await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBe(400);
  await scroll.evaluate(el => {
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
  });
  await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBe(400);
  await page.locator('revo-grid .header-wrapper').evaluate((el: HTMLElement) => { el.style.height = '100px'; });
  await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBe(460);
});

for (const placement of ['standalone', 'viewport'] as const) {
  for (const dimension of ['rgCol', 'rgRow'] as const) {
    test(`${placement} ${dimension} scrollbar handles differing extents, empty content, reconnect and compression`, async ({ page }) => {
      await mountGrid(page, {
        columns: [{ prop: 'id', size: 1000 }], source: [{ id: 0 }], width: 400, height: 240,
      });
      await page.evaluate(({ placement, dimension }) => {
        const scroll = document.createElement('revogr-scroll-virtual');
        scroll.id = 'edge-scroll';
        if (placement === 'viewport') scroll.slot = 'viewport';
        scroll.className = dimension === 'rgCol' ? 'horizontal' : 'vertical';
        scroll.dimension = dimension;
        scroll.realSize = 1800;
        scroll.clientSize = 700;
        scroll.virtualSize = 700;
        scroll.style.cssText = `position:absolute;left:0;top:0;${dimension === 'rgCol' ? 'width:180px;height:20px;' : 'height:180px;width:20px;'}`;
        scroll.addEventListener('scrollvirtual', (event: CustomEvent) => { scroll.dataset.coordinate = String(event.detail.coordinate); });
        (placement === 'viewport' ? document.querySelector('revo-grid')! : document.body).appendChild(scroll);
      }, { placement, dimension });
      const scroll = page.locator('#edge-scroll');
      const range = () => scroll.evaluate((el, dimension) => dimension === 'rgCol'
        ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight, dimension);
      await expect.poll(range).toBe(1100);
      await scroll.evaluate((el: HTMLRevogrScrollVirtualElement) => { el.virtualSize = 0; });
      await expect.poll(range).toBe(1100);
      await scroll.evaluate(async (el: HTMLRevogrScrollVirtualElement, dimension) => {
        await el.setScroll({ dimension, coordinate: 900 });
      }, dimension);
      await expect.poll(() => scroll.evaluate((el, dimension) => dimension === 'rgCol' ? el.scrollLeft : el.scrollTop, dimension)).toBe(900);
      await scroll.evaluate((el: HTMLRevogrScrollVirtualElement) => { el.realSize = 0; });
      await expect.poll(range).toBe(0);
      await scroll.evaluate((el: HTMLRevogrScrollVirtualElement) => { el.realSize = 1800; el.virtualSize = 300.5; });
      await expect.poll(async () => Math.abs(await range() - 1499.5)).toBeLessThanOrEqual(1);
      await scroll.evaluate(el => { el.style.display = 'none'; });
      await expect.poll(range).toBe(0);
      await scroll.evaluate(el => { el.style.display = ''; });
      await expect.poll(async () => Math.abs(await range() - 1499.5)).toBeLessThanOrEqual(1);
      await scroll.evaluate(el => { const parent = el.parentElement!; el.remove(); parent.appendChild(el); });
      await expect.poll(async () => Math.abs(await range() - 1499.5)).toBeLessThanOrEqual(1);
      await scroll.evaluate((el: HTMLRevogrScrollVirtualElement) => { el.realSize = 100_000_000; });
      await expect.poll(range).toBeGreaterThan(1_000_000);
      expect(await range()).toBeLessThan(99_999_699.5);
      await scroll.evaluate(async (el: HTMLRevogrScrollVirtualElement, dimension) => {
        await el.setScroll({ dimension, coordinate: 99_999_699.5 });
      }, dimension);
      await expect.poll(() => scroll.evaluate((el, dimension) => Math.abs((dimension === 'rgCol'
        ? el.scrollWidth - el.clientWidth - el.scrollLeft : el.scrollHeight - el.clientHeight - el.scrollTop)), dimension))
        .toBeLessThanOrEqual(1);
      await scroll.evaluate((el, dimension) => { if (dimension === 'rgCol') el.scrollLeft = 0; else el.scrollTop = 0; }, dimension);
      await expect.poll(() => scroll.getAttribute('data-coordinate')).toBe('0');
    });
  }
}

for (const pin of ['colPinStart', 'colPinEnd'] as const) {
  test(`built-in scrollbars retain their ranges with only ${pin} columns`, async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'id', size: 200, pin }],
      source: Array.from({ length: 20 }, (_, id) => ({ id })), rowSize: 30,
      width: 400, height: 240, rowHeaders: true,
    });
    await page.addStyleTag({ content: 'revo-grid { min-height:0; }' });
    const vertical = page.locator('revogr-scroll-virtual.vertical');
    await expect.poll(() => vertical.evaluate(el => el.scrollHeight - el.clientHeight)).toBe(390);
    const horizontal = page.locator('revogr-scroll-virtual.horizontal');
    await expect.poll(() => horizontal.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
    await page.locator(`revogr-viewport-scroll.${pin}`).hover();
    await page.mouse.wheel(0, 150);
    await expect.poll(() => page.locator(`revogr-viewport-scroll.${pin} .vertical-inner`).evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  });
}

for (const rtl of [false, true]) {
  test(`built-in ranges exclude both pinned sides and row headers in ${rtl ? 'RTL' : 'LTR'}`, async ({ page }) => {
    await mountGrid(page, {
      columns: [
        { prop: 'start', pin: 'colPinStart', size: 100 },
        { prop: 'id', size: 1000 },
        { prop: 'end', pin: 'colPinEnd', size: 80 },
      ],
      source: Array.from({ length: 20 }, (_, id) => ({ id })), rowSize: 30,
      width: 700, height: 240, rowHeaders: true, rtl,
    });
    await page.addStyleTag({ content: 'revo-grid { min-height:0; }' });
    for (const width of [700, 550, 900]) {
      await page.locator('revo-grid').evaluate((el: HTMLElement, width) => { el.style.width = `${width}px`; }, width);
      await expect.poll(() => page.locator('revo-grid').evaluate(grid => {
        const viewport = grid.querySelector<HTMLElement>('revogr-viewport-scroll.rgCol')!;
        const horizontal = grid.querySelector<HTMLElement>('revogr-scroll-virtual.horizontal')!;
        return Math.abs((horizontal.scrollWidth - horizontal.clientWidth) - (1000 - viewport.clientWidth));
      })).toBeLessThanOrEqual(1);
    }
  });
}
