import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  getCopiedText,
  mountGrid,
  setCellsFocus,
} from './helpers';

test.describe('clipboard', () => {
  test('copies the selected range as tabular text', async ({ page }) => {
      const source = [
        { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
        { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
      ];
  
      const columns = buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
        { prop: 'role', name: 'Role' },
      ]);
  
      await mountGrid(page, {
        columns,
        source,
        range: true,
      });
  
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);
    const copiedText = await getCopiedText(page);
    await expect(copiedText).toBe('Alice\tEngineer\nBen\tDesigner');
  });
});
