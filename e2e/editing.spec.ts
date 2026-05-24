import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  cancelEditCellValue,
  dataCell,
  editCellValue,
  mountGrid,
  setCellsFocus,
  type SampleRow,
} from './helpers';

test.describe('editing', () => {
  test('commits edits and cancels Escape changes', async ({ page }) => {
    const source: SampleRow[] = [
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
    });

    await editCellValue(page, 0, 'name', 'Alicia');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('Alicia');

    await cancelEditCellValue(page, 1, 'name', 'Benny');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
  });

  test('does not start editing from browser shortcut keys', async ({ page, browserName }) => {
    const source: SampleRow[] = [
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
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    const shortcutModifier =
      process.platform === 'darwin' && browserName === 'webkit'
        ? 'Meta'
        : 'Control';

    await page.keyboard.press(`${shortcutModifier}+F`);
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    await page.keyboard.press('Escape');
    await page.keyboard.press(`${shortcutModifier}+P`);
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
  });

  test('starts editing from Enter and printable keyboard input', async ({ page }) => {
    const source: SampleRow[] = [
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
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Enter');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('Alice');

    await page.keyboard.press('Escape');
    await page.waitForChanges();

    await setCellsFocus(page, { x: 1, y: 1 });
    await page.keyboard.press('Z');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('Z');
  });

  test('starts editing from AltGr printable characters', async ({ page }) => {
    const source: SampleRow[] = [
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
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '@',
        code: 'KeyQ',
        ctrlKey: true,
        altKey: true,
      });
      Object.defineProperty(event, 'getModifierState', {
        value: (key: string) => key === 'AltGraph',
      });
      document.dispatchEvent(event);
    });
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('@');
  });
});
