import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  getVisibleSource,
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

    const dragHandle = mainDataRows(page)
      .first()
      .locator('[data-rgCol="0"] .revo-draggable');
    const targetRow = mainDataRows(page).nth(2);
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
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

  test('keeps row in place when dropping on its original upper boundary', async ({
    page,
  }) => {
    const source = Array.from({ length: 20 }, (_, index) => ({
      a: `${index}:0`,
      b: `${index}:1`,
    }));

    const columns = buildColumns([
      { prop: 'a', name: 'A', rowDrag: true },
      { prop: 'b', name: 'B' },
    ]);

    await mountGrid(page, { columns, source });
    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      grid.addEventListener('roworderchanged', ((event: CustomEvent) => {
        (window as any).__rowOrderChanged = event.detail;
      }) as EventListener);
    });

    const dragHandle = mainDataRows(page)
      .nth(5)
      .locator('[data-rgCol="0"] .revo-draggable');
    const targetRow = mainDataRows(page).nth(4);
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        const rows = await getVisibleSource<{ a: string }>(page);
        return rows.map(row => row.a);
      })
      .toEqual([
        '0:0',
        '1:0',
        '2:0',
        '3:0',
        '4:0',
        '5:0',
        '6:0',
        '7:0',
        '8:0',
        '9:0',
        '10:0',
        '11:0',
        '12:0',
        '13:0',
        '14:0',
        '15:0',
        '16:0',
        '17:0',
        '18:0',
        '19:0',
      ]);
    await expect
      .poll(() => page.evaluate(() => (window as any).__rowOrderChanged))
      .toBeUndefined();
  });

  test('inserts an upward-dragged row after the ghost line', async ({
    page,
  }) => {
    const source = Array.from({ length: 20 }, (_, index) => ({
      a: `${index}:0`,
      b: `${index}:1`,
    }));

    const columns = buildColumns([
      { prop: 'a', name: 'A', rowDrag: true },
      { prop: 'b', name: 'B' },
    ]);

    await mountGrid(page, { columns, source });

    const dragHandle = mainDataRows(page)
      .nth(5)
      .locator('[data-rgCol="0"] .revo-draggable');
    const targetRow = mainDataRows(page).nth(3);
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        const rows = await getVisibleSource<{ a: string }>(page);
        return rows.map(row => row.a);
      })
      .toEqual([
        '0:0',
        '1:0',
        '2:0',
        '3:0',
        '5:0',
        '4:0',
        '6:0',
        '7:0',
        '8:0',
        '9:0',
        '10:0',
        '11:0',
        '12:0',
        '13:0',
        '14:0',
        '15:0',
        '16:0',
        '17:0',
        '18:0',
        '19:0',
      ]);
  });

  test('moves a row down by one position after the ghost line', async ({
    page,
  }) => {
    const source = Array.from({ length: 20 }, (_, index) => ({
      a: `${index}:0`,
      b: `${index}:1`,
    }));

    const columns = buildColumns([
      { prop: 'a', name: 'A', rowDrag: true },
      { prop: 'b', name: 'B' },
    ]);

    await mountGrid(page, { columns, source });

    const dragHandle = mainDataRows(page)
      .nth(4)
      .locator('[data-rgCol="0"] .revo-draggable');
    const targetRow = mainDataRows(page).nth(5);
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        const rows = await getVisibleSource<{ a: string }>(page);
        return rows.map(row => row.a);
      })
      .toEqual([
        '0:0',
        '1:0',
        '2:0',
        '3:0',
        '5:0',
        '4:0',
        '6:0',
        '7:0',
        '8:0',
        '9:0',
        '10:0',
        '11:0',
        '12:0',
        '13:0',
        '14:0',
        '15:0',
        '16:0',
        '17:0',
        '18:0',
        '19:0',
      ]);
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
    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      grid.addEventListener('columndragend', ((event: CustomEvent) => {
        (window as any).__columnDragEnd = {
          columns: event.detail.columns.map((column: any) => column.prop),
          order: event.detail.order,
          type: event.detail.type,
        };
      }) as EventListener);
    });
    const from = page
      .locator(
        'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
      )
      .nth(2);
    const to = page
      .locator(
        'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
      )
      .first();
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();

    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();

    await page.mouse.move(
      fromBox!.x + fromBox!.width / 2,
      fromBox!.y + fromBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(toBox!.x + 4, toBox!.y + toBox!.height / 2, {
      steps: 14,
    });
    await page.mouse.up();

    await expect
      .poll(() => visibleHeaderTexts(page))
      .not.toEqual(beforeHeaders);
    await expect
      .poll(() => page.evaluate(() => (window as any).__columnDragEnd))
      .toEqual({
        columns: ['role', 'id', 'name'],
        order: [2, 0, 1],
        type: 'rgCol',
      });
  });

  test('does not sort when a sortable header drag drops on the same column', async ({
    page,
  }) => {
    const source = [
      { id: 1, name: 'Charlie', role: 'Engineer' },
      { id: 2, name: 'Alice', role: 'Designer' },
      { id: 3, name: 'Bob', role: 'Manager' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', sortable: true },
      { prop: 'name', name: 'Name', sortable: true },
      { prop: 'role', name: 'Role', sortable: true },
    ]);

    await mountGrid(page, {
      columns,
      source,
      canMoveColumns: true,
    });

    const headers = page.locator(
      'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
    );
    const nameHeader = headers.nth(1);
    const headerBox = await nameHeader.boundingBox();

    expect(headerBox).not.toBeNull();

    const centerX = headerBox!.x + headerBox!.width / 2;
    const centerY = headerBox!.y + headerBox!.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 20, centerY, { steps: 6 });
    await page.waitForTimeout(20);
    await page.mouse.move(centerX, centerY, { steps: 6 });
    await page.mouse.up();

    await expect
      .poll(() => visibleHeaderTexts(page))
      .toEqual(['ID', 'Name', 'Role']);
    await expect
      .poll(() => visibleColumnValues(page, 1))
      .toEqual(['Charlie', 'Alice', 'Bob']);

    await nameHeader.click();

    await expect
      .poll(() => visibleColumnValues(page, 1))
      .toEqual(['Alice', 'Bob', 'Charlie']);
  });

  test('places right-to-left column drag indicator at the insertion edge', async ({
    page,
  }) => {
    const source = [{ a: 'a1', b: 'b1', c: 'c1', d: 'd1' }];

    const columns = buildColumns([
      { prop: 'a', name: 'A' },
      { prop: 'b', name: 'B' },
      { prop: 'c', name: 'C' },
      { prop: 'd', name: 'D' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      canMoveColumns: true,
      colSize: 100,
    });

    const headers = page.locator(
      'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
    );
    const from = headers.nth(3);
    const to = headers.nth(1);
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();

    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();

    await page.mouse.move(
      fromBox!.x + fromBox!.width / 2,
      fromBox!.y + fromBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      toBox!.x + toBox!.width / 2,
      toBox!.y + toBox!.height / 2,
      {
        steps: 20,
      },
    );

    const indicator = page.locator('revo-grid > .drag-position-y');
    await expect
      .poll(async () => {
        const box = await indicator.boundingBox();
        return Math.abs((box?.x ?? Number.POSITIVE_INFINITY) - toBox!.x);
      })
      .toBeLessThanOrEqual(1);

    await page.mouse.up();

    await expect
      .poll(() => visibleHeaderTexts(page))
      .toEqual(['A', 'D', 'B', 'C']);
  });
});
