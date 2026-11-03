import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid } from './helpers';

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
