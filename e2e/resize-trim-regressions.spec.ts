import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid, mainDataRows } from './helpers';

test('restores custom row heights after repeated trim and untrim', async ({ page }) => {
  await mountGrid(page, {
    columns: [{ prop: 'name', name: 'Name' }],
    source: ['A', 'Detail A', 'B', 'Detail B', 'Custom'].map(name => ({ name })),
    rowDefinitions: [
      { type: 'rgRow', index: 1, size: 80 },
      { type: 'rgRow', index: 3, size: 90 },
      { type: 'rgRow', index: 4, size: 65 },
    ],
    rowSize: 30, height: 500,
  });
  const heights = () => mainDataRows(page).evaluateAll(rows => rows.map(row => Math.round(row.getBoundingClientRect().height)));
  await expect.poll(heights).toEqual([30, 80, 30, 90, 65]);
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.evaluate(async () => {
      await document.querySelector('revo-grid')!.addTrimmed({ 0: true }, 'regression');
    });
    await expect.poll(heights).toEqual([80, 30, 90, 65]);
    await page.evaluate(async () => {
      await document.querySelector('revo-grid')!.addTrimmed({}, 'regression');
    });
    await expect.poll(heights).toEqual([30, 80, 30, 90, 65]);
  }
});

test('retains rendered windows during resize synchronization and fills a larger viewport', async ({ page }) => {
  await mountGrid(page, {
    columns: Array.from({ length: 30 }, (_, i) => ({ prop: `c${i}`, name: `C${i}`, size: 80 })),
    source: Array.from({ length: 100 }, (_, r) => Object.fromEntries(
      Array.from({ length: 30 }, (_, c) => [`c${c}`, `${r}:${c}`]),
    )),
    width: 400, height: 300, rowSize: 30,
  });
  await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);
  const synchronization = await page.evaluate(async () => {
    const grid = document.querySelector('revo-grid')!;
    const providers = (await grid.getProviders())!;
    const viewport = grid.querySelector('revogr-viewport-scroll.rgCol')!;
    return ['rgRow', 'rgCol'].map(dimension => {
      const type = dimension as 'rgRow' | 'rgCol';
      const store = providers.viewport.stores[type].store;
      const items = store.get('items');
      if (!items.length) throw new Error(`No initial ${type} window`);
      const size = store.get('virtualSize');
      viewport.dispatchEvent(new CustomEvent('resizeviewport', { bubbles: true, detail: { dimension, size: size + 40 } }));
      const retained = store.get('items') === items;
      viewport.dispatchEvent(new CustomEvent('resizeviewport', { bubbles: true, detail: { dimension, size: size + 40 } }));
      return { retained, repeated: store.get('items') === items, size: store.get('virtualSize'), expected: size + 40 };
    });
  });
  for (const result of synchronization) {
    expect(result.retained).toBe(true);
    expect(result.repeated).toBe(true);
    expect(result.size).toBe(result.expected);
  }
  const initialRows = await mainDataRows(page).count();
  const initialHeaders = await page.locator('revogr-header .rgHeaderCell').count();
  await page.evaluate(() => {
    const host = document.querySelector('revo-grid')!.parentElement!;
    host.style.width = '900px'; host.style.height = '550px';
  });
  await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(initialRows);
  await expect.poll(() => page.locator('revogr-header .rgHeaderCell').count()).toBeGreaterThan(initialHeaders);
  const largerRows = await mainDataRows(page).count();
  const largerHeaders = await page.locator('revogr-header .rgHeaderCell').count();
  await page.evaluate(() => {
    const host = document.querySelector('revo-grid')!.parentElement!;
    host.style.width = '400px'; host.style.height = '300px';
  });
  await expect.poll(() => mainDataRows(page).count()).toBeLessThan(largerRows);
  await expect.poll(() => page.locator('revogr-header .rgHeaderCell').count()).toBeLessThan(largerHeaders);
  await expect(mainDataRows(page).first()).toContainText('0:0');
});
