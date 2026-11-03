import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  callGridMethod,
  dataCell,
  getVisibleSource,
  mountGrid,
  pinnedStartCell,
  scrollToCell,
} from './helpers';

test.describe('setDataAt', () => {
  test('refreshes the requested cell after horizontal virtualization', async ({ page }) => {
    const columns = Array.from({ length: 30 }, (_, index) => ({
      prop: `c${index}`,
      size: 100,
    }));
    const source = [Object.fromEntries(columns.map(({ prop }) => [prop, prop]))];
    await mountGrid(page, { columns, source, width: 350 });

    await scrollToCell(page, 2000, 0);
    await expect(dataCell(page, 0, 20)).toHaveText('c20');
    await expect(dataCell(page, 0, 0)).toHaveCount(0);

    await callGridMethod(page, 'setDataAt', { row: 0, col: 20, val: 'updated' });
    expect((await getVisibleSource(page))[0].c20).toBe('updated');
    await expect(dataCell(page, 0, 20)).toHaveText('updated');
    await expect(dataCell(page, 0, 21)).toHaveText('c21');

    // Offscreen updates must not redraw another visible column.
    await callGridMethod(page, 'setDataAt', { row: 0, col: 0, val: 'offscreen' });
    await expect(dataCell(page, 0, 20)).toHaveText('updated');
    await expect(dataCell(page, 0, 21)).toHaveText('c21');
    await scrollToCell(page, 0, 0);
    await expect(dataCell(page, 0, 0)).toHaveText('offscreen');
    await scrollToCell(page, 2000, 0);
    await expect(dataCell(page, 0, 20)).toHaveText('updated');
  });

  test('refreshes by column identity when an earlier cell render is prevented', async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'a' }, { prop: 'b' }, { prop: 'c' }],
      source: [{ a: 'A', b: 'B', c: 'C' }],
    });
    await page.evaluate(async () => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
      grid.addEventListener('beforecellrender', event => {
        if (event.detail.colType === 'rgCol' && event.detail.column.itemIndex === 0) {
          event.preventDefault();
        }
      });
      await grid.refresh();
    });
    await page.waitForChanges();
    await expect(dataCell(page, 0, 0)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('B');

    await callGridMethod(page, 'setDataAt', { row: 0, col: 1, val: 'updated' });
    expect((await getVisibleSource(page))[0].b).toBe('updated');
    await expect(dataCell(page, 0, 1)).toHaveText('updated');
    await expect(dataCell(page, 0, 2)).toHaveText('C');

    await callGridMethod(page, 'setDataAt', { row: 0, col: 0, val: 'hidden' });
    await expect(dataCell(page, 0, 0)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('updated');
    await expect(dataCell(page, 0, 2)).toHaveText('C');
  });

  test('preserves normal, pinned and render-only updates', async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'pinned', pin: 'colPinStart' }, { prop: 'a' }, { prop: 'b' }],
      source: [{ pinned: 'P', a: 'A', b: 'B' }],
    });
    await expect(dataCell(page, 0, 0)).toHaveText('A');
    await expect(pinnedStartCell(page, 0)).toHaveText('P');
    await callGridMethod(page, 'setDataAt', { row: 0, col: 0, val: 'updated' });
    await expect(dataCell(page, 0, 0)).toHaveText('updated');
    await expect(dataCell(page, 0, 1)).toHaveText('B');
    await expect(pinnedStartCell(page, 0)).toHaveText('P');

    await callGridMethod(page, 'setDataAt', {
      row: 0, col: 0, colType: 'colPinStart', val: 'pinned update',
    });
    await expect(pinnedStartCell(page, 0)).toHaveText('pinned update');
    await expect(dataCell(page, 0, 0)).toHaveText('updated');

    await page.evaluate(() => {
      document.querySelector<HTMLRevoGridElement>('revo-grid')!.source[0].a = 'external';
    });
    await callGridMethod(page, 'setDataAt', {
      row: 0, col: 0, val: 'ignored', skipDataUpdate: true,
    });
    await expect(dataCell(page, 0, 0)).toHaveText('external');
    expect((await getVisibleSource(page))[0].a).toBe('external');

    await callGridMethod(page, 'setDataAt', {
      row: 999, col: 0, skipDataUpdate: true,
    });
    await expect(dataCell(page, 0, 0)).toHaveText('external');
  });
});
