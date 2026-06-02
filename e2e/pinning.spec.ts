import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import type { E2EPage } from '@stencil/playwright';
import {
  SELECTORS,
  buildRows,
  callGridMethod,
  dataCell,
  dispatchClipboardEvent,
  mountGrid,
  pinnedBottomCell,
  pinnedEndCell,
  pinnedStartCell,
  pinnedTopCell,
  getSelectedRange,
  setCellsFocus,
  scrollToCell,
  visibleColumnValues,
} from './helpers';

async function expectNoPinnedStartGap(page: E2EPage) {
  const pinnedCells = page.locator(
    `${SELECTORS.pinnedStartViewport} revogr-data[type="rgRow"] [data-rgRow="0"].rgCell`,
  );
  const regularCell = dataCell(page, 0, 0);

  const pinnedCount = await pinnedCells.count();
  expect(pinnedCount).toBeGreaterThan(0);
  const pinnedCell = pinnedCells.nth(pinnedCount - 1);

  await expect(pinnedCell).toBeVisible();
  await expect(regularCell).toBeVisible();

  await expect
    .poll(async () => {
      const pinnedBox = await pinnedCell.boundingBox();
      const regularBox = await regularCell.boundingBox();
      if (!pinnedBox || !regularBox) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.abs(regularBox.x - (pinnedBox.x + pinnedBox.width));
    })
    .toBeLessThanOrEqual(2);
}

test.describe('pinning', () => {
  test('keeps pinned rows and pinned columns visible while scrolling', async ({ page }) => {
    const rowSize = 30;
    const source = buildRows(30, ['left', 'name', 'middle', 'right']).map((row, index) => ({
      left: `Left ${index + 1}`,
      name: `Name ${index + 1}`,
      middle: `Middle ${index + 1}`,
      right: `Right ${index + 1}`,
    }));

    const columns = [
      { prop: 'left', name: 'Left', pin: 'colPinStart' as const, size: 120 },
      { prop: 'name', name: 'Name', size: 120 },
      { prop: 'middle', name: 'Middle', size: 120 },
      { prop: 'right', name: 'Right', pin: 'colPinEnd' as const, size: 120 },
    ];

    await mountGrid(page, {
      columns,
      source,
      pinnedTopSource: [{ left: 'Pinned Top', name: 'Top', middle: 'Pinned', right: 'Top Right' }],
      pinnedBottomSource: [{ left: 'Pinned Bottom', name: 'Bottom', middle: 'Pinned', right: 'Bottom Right' }],
      width: 420,
      height: 320,
      rowSize,
      colSize: 120,
    });

    await scrollToCell(page, 240, rowSize * 20);

    await expect(page.locator(SELECTORS.pinnedStartViewport)).toBeVisible();
    await expect(page.locator(SELECTORS.pinnedEndViewport)).toBeVisible();
    await expect(pinnedStartCell(page, 20, 0)).toHaveText('Left 21');
    await expect(pinnedEndCell(page, 20, 0)).toHaveText('Right 21');
    await expect(pinnedTopCell(page, 0, 0)).toHaveText('Top');
    await expect(pinnedBottomCell(page, 0, 0)).toHaveText('Bottom');

    const visibleMiddleValues = await visibleColumnValues(page, 1);
    expect(visibleMiddleValues.includes('Middle 21')).toBe(true);
  });

  test('keeps pinned bottom rows directly after short body content', async ({ page }) => {
    const rowSize = 30;
    const source = buildRows(3, ['name', 'status']).map((row, index) => ({
      name: `Name ${index + 1}`,
      status: `Status ${index + 1}`,
    }));

    await mountGrid(page, {
      columns: [
        { prop: 'name', name: 'Name', size: 160 },
        { prop: 'status', name: 'Status', size: 160 },
      ],
      source,
      pinnedBottomSource: [{ name: 'Pinned Bottom', status: 'Summary' }],
      width: 420,
      height: 360,
      rowSize,
      colSize: 160,
    });

    await expect(dataCell(page, 2, 0)).toHaveText('Name 3');
    await expect(pinnedBottomCell(page, 0, 0)).toHaveText('Pinned Bottom');

    const verticalScroll = page.locator(`${SELECTORS.mainViewport} .vertical-inner`);
    await expect
      .poll(() =>
        verticalScroll.evaluate((el: HTMLElement) => el.scrollHeight - el.clientHeight),
      )
      .toBeLessThanOrEqual(0);

    const lastBodyBox = await dataCell(page, 2, 0).boundingBox();
    const pinnedBottomBox = await pinnedBottomCell(page, 0, 0).boundingBox();
    expect(lastBodyBox).not.toBeNull();
    expect(pinnedBottomBox).not.toBeNull();

    const gap = pinnedBottomBox!.y - (lastBodyBox!.y + lastBodyBox!.height);
    expect(gap).toBeGreaterThanOrEqual(-1);
    expect(gap).toBeLessThanOrEqual(2);
  });

  test('shrinks pinned start viewport after removing a pinned column', async ({ page }) => {
    const columns = [
      { prop: 'index', name: 'Index', pin: 'colPinStart' as const, size: 100 },
      { prop: 'name', name: 'Name', pin: 'colPinStart' as const, size: 100 },
      { prop: 'age', name: 'Age', size: 100 },
    ];

    await mountGrid(page, {
      columns,
      source: [
        { index: 1, name: 'John', age: 30 },
        { index: 2, name: 'Jane', age: 25 },
        { index: 3, name: 'Bob', age: 35 },
      ],
      width: 760,
      height: 260,
      colSize: 100,
    });

    await expect(pinnedStartCell(page, 0, 0)).toHaveText('1');
    await expect(pinnedStartCell(page, 0, 1)).toHaveText('John');
    await expect(dataCell(page, 0, 0)).toHaveText('30');
    await expectNoPinnedStartGap(page);

    await page.evaluate((nextColumns) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid was not created');
      }
      grid.columns = nextColumns;
    }, columns.slice(1));
    await page.waitForChanges();

    await expect(pinnedStartCell(page, 0, 0)).toHaveText('John');
    await expect(dataCell(page, 0, 0)).toHaveText('30');
    await expectNoPinnedStartGap(page);
  });

  test('distinguishes pinned start and regular selected ranges by column type', async ({ page }) => {
    const source = buildRows(3, ['col1', 'col2', 'col3']).map((row, index) => ({
      col1: `A${index + 1}`,
      col2: `B${index + 1}`,
      col3: `C${index + 1}`,
    }));

    await mountGrid(page, {
      columns: [
        { prop: 'col1', name: 'A', pin: 'colPinStart' as const, size: 130 },
        { prop: 'col2', name: 'B', size: 130 },
        { prop: 'col3', name: 'C', size: 130 },
      ],
      source,
      width: 420,
      height: 240,
      range: true,
      colSize: 130,
    });

    await setCellsFocus(page, { x: 0, y: 0 }, { x: 0, y: 0 }, 'colPinStart');
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      x1: 0,
      y: 0,
      y1: 0,
      colType: 'colPinStart',
      rowType: 'rgRow',
    });

    await setCellsFocus(page, { x: 0, y: 0 }, { x: 0, y: 0 }, 'rgCol');
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      x1: 0,
      y: 0,
      y1: 0,
      colType: 'rgCol',
      rowType: 'rgRow',
    });
  });

  test('keeps focused cell aligned when its column is pinned left', async ({ page }) => {
    const source = buildRows(8, ['invoice', 'customer', 'status']).map((row, index) => ({
      invoice: `invoice-${index + 1}`,
      customer: `Customer ${index + 1}`,
      status: `Status ${index + 1}`,
    }));

    await mountGrid(page, {
      columns: [
        { prop: 'invoice', name: 'Invoice', size: 150 },
        { prop: 'customer', name: 'Customer', size: 180 },
        { prop: 'status', name: 'Status', size: 150 },
      ],
      source,
      width: 520,
      height: 300,
      range: true,
      colSize: 150,
    });

    await setCellsFocus(page, { x: 1, y: 4 });
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 1,
      y: 4,
      x1: 1,
      y1: 4,
      colType: 'rgCol',
      rowType: 'rgRow',
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      grid.columns = [
        { prop: 'invoice', name: 'Invoice', size: 150 },
        { prop: 'customer', name: 'Customer', size: 180, pin: 'colPinStart' },
        { prop: 'status', name: 'Status', size: 150 },
      ];
    });
    await page.waitForChanges();

    await expect(pinnedStartCell(page, 4, 0)).toHaveText('Customer 5');
    await expect(dataCell(page, 4, 0)).toHaveText('invoice-5');
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: 4,
      x1: 0,
      y1: 4,
      colType: 'colPinStart',
      rowType: 'rgRow',
    });

    const focusedBox = await page.locator(SELECTORS.focusedCell).boundingBox();
    const pinnedCellBox = await pinnedStartCell(page, 4, 0).boundingBox();
    expect(focusedBox).not.toBeNull();
    expect(pinnedCellBox).not.toBeNull();
    expect(Math.abs(focusedBox!.x - pinnedCellBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(focusedBox!.y - pinnedCellBox!.y)).toBeLessThanOrEqual(2);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      grid.columns = [
        { prop: 'invoice', name: 'Invoice', size: 150 },
        { prop: 'customer', name: 'Customer', size: 180 },
        { prop: 'status', name: 'Status', size: 150 },
      ];
    });
    await page.waitForChanges();

    await expect(dataCell(page, 4, 0)).toHaveText('invoice-5');
    await expect(dataCell(page, 4, 1)).toHaveText('Customer 5');
    await expect(pinnedStartCell(page, 4, 0)).toHaveCount(0);
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 1,
      y: 4,
      x1: 1,
      y1: 4,
      colType: 'rgCol',
      rowType: 'rgRow',
    });

    const unpinnedFocusedBox = await page.locator(SELECTORS.focusedCell).boundingBox();
    const unpinnedCellBox = await dataCell(page, 4, 1).boundingBox();
    expect(unpinnedFocusedBox).not.toBeNull();
    expect(unpinnedCellBox).not.toBeNull();
    expect(Math.abs(unpinnedFocusedBox!.x - unpinnedCellBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(unpinnedFocusedBox!.y - unpinnedCellBox!.y)).toBeLessThanOrEqual(2);
  });

  test('keeps selected range when regular columns refresh without repartitioning', async ({ page }) => {
    const source = buildRows(5, ['invoice', 'customer', 'status']).map((row, index) => ({
      invoice: `invoice-${index + 1}`,
      customer: `Customer ${index + 1}`,
      status: `Status ${index + 1}`,
    }));

    await mountGrid(page, {
      columns: [
        { prop: 'invoice', name: 'Invoice', size: 150 },
        { prop: 'customer', name: 'Customer', size: 180 },
        { prop: 'status', name: 'Status', size: 150 },
      ],
      source,
      width: 520,
      height: 260,
      range: true,
      colSize: 150,
    });

    await setCellsFocus(page, { x: 0, y: 1 }, { x: 1, y: 3 });
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: 1,
      x1: 1,
      y1: 3,
      colType: 'rgCol',
      rowType: 'rgRow',
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      grid.columns = [
        { prop: 'invoice', name: 'Invoice #', size: 150 },
        { prop: 'customer', name: 'Customer name', size: 180 },
        { prop: 'status', name: 'Current status', size: 150 },
      ];
    });
    await page.waitForChanges();

    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: 1,
      x1: 1,
      y1: 3,
      colType: 'rgCol',
      rowType: 'rgRow',
    });
  });

  test('keeps pinned areas aligned after compressed deep row scroll', async ({ page }) => {
    const rowSize = 30;
    const rowCount = 1_200_000;
    const targetRow = 1_100_000;

    await page.setContent(`
      <div style="width:620px; height:320px;">
        <revo-grid style="display:block; width:100%; height:100%;"></revo-grid>
      </div>
    `);
    await page.waitForSelector(SELECTORS.grid);
    await page.evaluate(({ rowCount, rowSize }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not created');
      }
      grid.columns = [
        { prop: 'left', name: 'Left', pin: 'colPinStart', size: 120 },
        { prop: 'name', name: 'Name', size: 150 },
        { prop: 'middle', name: 'Middle', size: 150 },
        { prop: 'right', name: 'Right', pin: 'colPinEnd', size: 120 },
      ];
      grid.source = Array.from({ length: rowCount }, (_, index) => ({
        left: `Left ${index + 1}`,
        name: `Name ${index + 1}`,
        middle: `Middle ${index + 1}`,
        right: `Right ${index + 1}`,
      }));
      grid.pinnedTopSource = [{
        left: 'Top Left',
        name: 'Top Name',
        middle: 'Top Middle',
        right: 'Top Right',
      }];
      grid.pinnedBottomSource = [{
        left: 'Bottom Left',
        name: 'Bottom Name',
        middle: 'Bottom Middle',
        right: 'Bottom Right',
      }];
      grid.rowSize = rowSize;
      grid.range = true;
    }, { rowCount, rowSize });
    await page.waitForChanges();

    const logicalContentSize = await callGridMethod<{ y: number }>(page, 'getContentSize');
    const physicalScrollHeight = await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .evaluate((el: HTMLElement) => el.scrollHeight);
    expect(physicalScrollHeight).toBeLessThan(logicalContentSize.y);

    await callGridMethod(page, 'scrollToRow', targetRow);
    await page.waitForChanges();

    const mainCell = dataCell(page, targetRow, 0);
    const pinnedStart = pinnedStartCell(page, targetRow, 0);
    const pinnedEnd = pinnedEndCell(page, targetRow, 0);
    await expect(mainCell).toHaveText(`Name ${targetRow + 1}`);
    await expect(pinnedStart).toHaveText(`Left ${targetRow + 1}`);
    await expect(pinnedEnd).toHaveText(`Right ${targetRow + 1}`);
    await expect(pinnedTopCell(page, 0, 0)).toHaveText('Top Name');
    await expect(pinnedBottomCell(page, 0, 0)).toHaveText('Bottom Name');
    await expect(
      page.locator(`${SELECTORS.pinnedStartViewport} revogr-data[type="rowPinStart"] [data-rgRow="0"][data-rgCol="0"]`),
    ).toHaveText('Top Left');
    await expect(
      page.locator(`${SELECTORS.pinnedEndViewport} revogr-data[type="rowPinEnd"] [data-rgRow="0"][data-rgCol="0"]`),
    ).toHaveText('Bottom Right');

    const mainBox = await mainCell.boundingBox();
    const pinnedStartBox = await pinnedStart.boundingBox();
    const pinnedEndBox = await pinnedEnd.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(pinnedStartBox).not.toBeNull();
    expect(pinnedEndBox).not.toBeNull();
    expect(Math.abs(mainBox!.y - pinnedStartBox!.y)).toBeLessThan(2);
    expect(Math.abs(mainBox!.y - pinnedEndBox!.y)).toBeLessThan(2);

    await page.mouse.click(
      pinnedStartBox!.x + pinnedStartBox!.width / 2,
      pinnedStartBox!.y + pinnedStartBox!.height / 2,
    );
    await page.waitForChanges();
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: targetRow,
      x1: 0,
      y1: targetRow,
      colType: 'colPinStart',
      rowType: 'rgRow',
    });

    const focus = page.locator(SELECTORS.focusedCell);
    const focusBox = await focus.boundingBox();
    expect(focusBox).not.toBeNull();
    expect(Math.abs(pinnedStartBox!.x - focusBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(pinnedStartBox!.y - focusBox!.y)).toBeLessThanOrEqual(2);

    await setCellsFocus(
      page,
      { x: 0, y: targetRow + 1 },
      { x: 0, y: targetRow + 2 },
      'colPinStart',
    );
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 0,
      y: targetRow + 1,
      x1: 0,
      y1: targetRow + 2,
      colType: 'colPinStart',
      rowType: 'rgRow',
    });

    await setCellsFocus(page, { x: 0, y: targetRow + 3 }, undefined, 'colPinStart');
    await dispatchClipboardEvent(page, 'paste', 'Pinned Paste');
    await expect(pinnedStartCell(page, targetRow + 3, 0)).toHaveText('Pinned Paste');
  });

  test('keeps pinned horizontal wheel transfer logical after compressed deep column scroll', async ({ page }) => {
    const colSize = 300;
    const colCount = 120_000;
    const targetColumn = 110_000;

    await page.setContent(`
      <div style="width:720px; height:240px;">
        <revo-grid style="display:block; width:100%; height:100%;"></revo-grid>
      </div>
    `);
    await page.waitForSelector(SELECTORS.grid);
    await page.evaluate(({ colCount, colSize }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not created');
      }
      (window as any).__viewportScrolls = [];
      grid.addEventListener('viewportscroll', ((event: CustomEvent) => {
        if (event.detail.dimension === 'rgCol') {
          (window as any).__viewportScrolls.push(event.detail.coordinate);
        }
      }) as EventListener);
      const cellParser = (model: Record<string, number>, column: { prop: string }) =>
        `${model.row}:${column.prop}`;
      grid.columns = [
        { prop: 'pin', name: 'Pin', pin: 'colPinStart', size: 120 },
        ...Array.from({ length: colCount }, (_, index) => ({
          prop: `c${index}`,
          name: `C ${index}`,
          size: colSize,
          cellParser,
        })),
      ];
      grid.source = [{ row: 1, pin: 'Pinned' }];
      grid.colSize = colSize;
    }, { colCount, colSize });
    await page.waitForChanges();

    const logicalContentSize = await callGridMethod<{ x: number }>(page, 'getContentSize');
    const physicalScrollWidth = await page
      .locator(SELECTORS.mainViewport)
      .evaluate((el: HTMLElement) => el.scrollWidth);
    expect(physicalScrollWidth).toBeLessThan(logicalContentSize.x);

    await callGridMethod(page, 'scrollToColumnIndex', targetColumn);
    await page.waitForChanges();
    await expect(dataCell(page, 0, targetColumn)).toHaveText(`1:c${targetColumn}`);

    const beforeWheelCoordinate = await page.evaluate(() => {
      const scrolls = (window as any).__viewportScrolls || [];
      return scrolls.at(-1) ?? 0;
    });
    await page.locator(SELECTORS.pinnedStartViewport).dispatchEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
    });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const scrolls = (window as any).__viewportScrolls || [];
          return scrolls.at(-1) ?? 0;
        }),
      )
      .toBeGreaterThan(beforeWheelCoordinate);
    const afterWheelCoordinate = await page.evaluate(() => {
      const scrolls = (window as any).__viewportScrolls || [];
      return scrolls.at(-1) ?? 0;
    });
    expect(afterWheelCoordinate - beforeWheelCoordinate).toBeGreaterThanOrEqual(100);
    expect(afterWheelCoordinate - beforeWheelCoordinate).toBeLessThanOrEqual(140);
  });
});
