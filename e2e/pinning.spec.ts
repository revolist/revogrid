import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
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
