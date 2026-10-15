import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { SELECTORS, basicColumns, SAMPLE_ROWS } from './helpers';

// mountGrid assigns explicit false values, so create grids directly to exercise
// the defaults seen by applications that omit these optional properties.
for (const mode of ['omitted', 'disabled', 'enabled', 'filter config'] as const) {
  test(`keeps optional features opt-in: ${mode}`, async ({ page }) => {
    await page.setContent('<div id="host" style="width:900px;height:360px"></div>');
    await page.evaluate(({ mode, columns, source }) => {
      const grid = document.createElement('revo-grid');
      grid.style.cssText = 'display:block;width:100%;height:100%';
      grid.columns = columns;
      grid.source = source;
      if (mode === 'enabled' || mode === 'disabled') {
        grid.filter = grid.canMoveColumns = grid.resize = grid.exporting = mode === 'enabled';
      } else if (mode === 'filter config') {
        grid.filter = { collection: { name: { type: 'eq', value: 'Alice' } } };
      }
      document.querySelector('#host')!.append(grid);
    }, { mode, columns: basicColumns(), source: SAMPLE_ROWS.pair });
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.actualHeaderCells)).not.toHaveCount(0);

    const state = await page.evaluate(async () => {
      const grid = document.querySelector('revo-grid')!;
      const plugins = await grid.getPlugins();
      return {
        filter: !!grid.filter,
        canMoveColumns: grid.canMoveColumns,
        resize: grid.resize,
        exporting: grid.exporting,
        filterPlugin: plugins.some(plugin => 'filterCollection' in plugin),
        columnMovePlugin: plugins.some(plugin => 'clearOrder' in plugin),
        exportPlugin: plugins.some(plugin => 'exportFile' in plugin),
      };
    });
    const enabled = mode === 'enabled';
    const filtering = enabled || mode === 'filter config';
    expect(state).toEqual({
      filter: filtering,
      canMoveColumns: enabled,
      resize: enabled,
      exporting: enabled,
      filterPlugin: filtering,
      columnMovePlugin: enabled,
      exportPlugin: enabled,
    });
    expect(await page.locator(SELECTORS.filterButton).count()).toBe(filtering ? 4 : 0);
    expect(await page.locator(`${SELECTORS.actualHeaderCells} .resizable`).count()).toBe(enabled ? 4 : 0);
    if (mode === 'filter config') {
      await expect(page.locator(SELECTORS.renderedRows)).toHaveCount(1);
    }
  });
}
