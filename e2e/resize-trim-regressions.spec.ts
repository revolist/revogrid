import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid, mainDataRows, dataCell, scrollToCell } from './helpers';

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

test('keeps visible cells covered when growing and shrinking at the bottom-right scroll boundary', async ({ page }) => {
  await mountGrid(page, {
    columns: Array.from({ length: 30 }, (_, i) => ({ prop: `c${i}`, name: `C${i}`, size: 80 })),
    source: Array.from({ length: 100 }, (_, r) => Object.fromEntries(
      Array.from({ length: 30 }, (_, c) => [`c${c}`, `${r}:${c}`]),
    )),
    width: 400, height: 300, rowSize: 30,
  });
  await scrollToCell(page, 2400, 3000);
  await expect(dataCell(page, 99, 29)).toBeInViewport();

  const scrollPosition = () => page.locator('revogr-viewport-scroll.rgCol').evaluate(viewport => {
    const vertical = viewport.querySelector<HTMLElement>('.vertical-inner')!;
    return {
      x: viewport.scrollLeft, y: vertical.scrollTop,
      maxX: viewport.scrollWidth - viewport.clientWidth,
      maxY: vertical.scrollHeight - vertical.clientHeight,
      width: viewport.clientWidth, height: vertical.clientHeight,
    };
  });
  await expect.poll(async () => {
    const position = await scrollPosition();
    return [Math.abs(position.x - position.maxX), Math.abs(position.y - position.maxY)];
  }).toEqual([0, 0]);
  const initial = await scrollPosition();
  const monitor = await page.evaluateHandle(async () => {
    const providers = (await document.querySelector('revo-grid')!.getProviders())!;
    const emptyWindows: string[] = [];
    const unsubscribers = (['rgRow', 'rgCol'] as const).map(type =>
      providers.viewport.stores[type].store.onChange('items', items => {
        if (!items.length) emptyWindows.push(type);
      }),
    );
    return { emptyWindows, stop: () => unsubscribers.forEach(unsubscribe => unsubscribe()) };
  });
  // Check actual painted cells near all four viewport corners. Keep samples
  // clear of borders and the attribution overlay at the bottom-left edge.
  const cornerCells = () => page.locator('revogr-viewport-scroll.rgCol').evaluate(viewport => {
    const vertical = viewport.querySelector<HTMLElement>('.vertical-inner')!;
    const left = viewport.getBoundingClientRect().left;
    const top = vertical.getBoundingClientRect().top;
    return [24, vertical.clientHeight - 24].flatMap(y =>
      [24, viewport.clientWidth - 24].map(x => {
        const cell = document.elementFromPoint(left + x, top + y)?.closest('[data-rgRow][data-rgCol]');
        const row = Math.floor((vertical.scrollTop + y) / 30);
        const column = Math.floor((viewport.scrollLeft + x) / 80);
        const actual = cell?.textContent?.trim();
        return actual === `${row}:${column}` ? 'covered' : `${actual ?? 'blank'} (expected ${row}:${column})`;
      }),
    );
  });
  await expect.poll(cornerCells).toEqual(['covered', 'covered', 'covered', 'covered']);
  await page.evaluate(() => {
    const host = document.querySelector('revo-grid')!.parentElement!;
    host.style.width = '900px'; host.style.height = '550px';
  });
  await expect.poll(async () => {
    const position = await scrollPosition();
    return position.width > initial.width && position.height > initial.height
      && position.x < initial.x && position.y < initial.y
      && position.x === position.maxX && position.y === position.maxY;
  }).toBe(true);
  await expect(dataCell(page, 99, 29)).toBeInViewport();
  await expect.poll(cornerCells).toEqual(['covered', 'covered', 'covered', 'covered']);
  const expanded = await scrollPosition();
  const expandedRows = await mainDataRows(page).count();
  const expandedHeaders = await page.locator('revogr-header .rgHeaderCell').count();

  await page.evaluate(() => {
    const host = document.querySelector('revo-grid')!.parentElement!;
    host.style.width = '400px'; host.style.height = '300px';
  });
  await expect.poll(async () => {
    const position = await scrollPosition();
    return position.width === initial.width && position.height === initial.height
      && position.x === expanded.x && position.y === expanded.y;
  }).toBe(true);
  await expect.poll(() => mainDataRows(page).count()).toBeLessThan(expandedRows);
  await expect.poll(() => page.locator('revogr-header .rgHeaderCell').count()).toBeLessThan(expandedHeaders);
  await expect.poll(cornerCells).toEqual(['covered', 'covered', 'covered', 'covered']);
  expect(await monitor.evaluate(state => state.emptyWindows)).toEqual([]);
  await monitor.evaluate(state => state.stop());
  await monitor.dispose();
});

test('fills an opted-in pinned viewport immediately after growth without scrolling', async ({ page }) => {
  await mountGrid(page, {
    columns: [
      { prop: 'id', name: 'ID' },
      ...Array.from({ length: 30 }, (_, i) => ({ prop: `c${i}`, name: `C${i}`, size: 80, pin: 'colPinEnd' as const })),
    ],
    source: [Object.fromEntries([['id', 'row'], ...Array.from({ length: 30 }, (_, i) => [`c${i}`, `Value ${i}`])])],
  });
  await page.evaluate(() => { document.querySelector('revo-grid')!.virtualX = ['rgCol', 'colPinEnd']; });
  await page.waitForChanges();
  const coverage = await page.evaluate(async () => {
    const grid = document.querySelector('revo-grid')!;
    const providers = (await grid.getProviders())!;
    providers.viewport.setViewport('colPinEnd', { virtualSize: 100, clientSize: 100 });
    providers.dimension.setViewPortCoordinate({ type: 'colPinEnd', coordinate: 0, force: true });
    const store = providers.viewport.stores.colPinEnd.store;
    const before = store.get('items').length;
    grid.querySelector('revogr-viewport-scroll.colPinEnd')!.dispatchEvent(
      new CustomEvent('resizeviewport', { bubbles: true, detail: { dimension: 'rgCol', size: 400 } }),
    );
    return { before, after: store.get('items').length, end: Math.max(...store.get('items').map(item => item.end)) };
  });
  expect(coverage.after).toBeGreaterThan(coverage.before);
  expect(coverage.end).toBeGreaterThanOrEqual(400);
  await expect(page.locator('revogr-viewport-scroll.colPinEnd revogr-header .rgHeaderCell')).toHaveCount(coverage.after);
});
