import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  mainDataRows,
  mountGrid,
  visibleHeaderTexts,
  visibleColumnValues,
} from './helpers';

test.describe('reordering', () => {
  test('reorders rows by dragging the row handle', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'name', name: 'Name', rowDrag: true },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, { columns, source });

    const dragHandle = mainDataRows(page).first().locator('[data-rgCol="0"] .revo-draggable');
    const targetRow = mainDataRows(page).nth(2);
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height + 20,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(() => visibleColumnValues(page, 0))
      .not.toEqual(['Alice', 'Ben', 'Cara']);
  });

  test('reorders columns by dragging the header', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer' },
      { id: 2, name: 'Ben', role: 'Designer' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      canMoveColumns: true,
    });

    const beforeHeaders = await visibleHeaderTexts(page);
    const from = page.locator('revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell').nth(2);
    const to = page.locator('revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell').first();
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();

    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();

    await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox!.x + 4, toBox!.y + toBox!.height / 2, {
      steps: 14,
    });
    await page.mouse.up();

    await expect
      .poll(() => visibleHeaderTexts(page))
      .not.toEqual(beforeHeaders);
  });
});
