import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildRows,
  callGridMethod,
  dataCell,
  dispatchClipboardEvent,
  editCellValue,
  getCopiedText,
  getFocused,
  getSelectedRange,
  mainDataRows,
  mountGrid,
  SELECTORS,
  scrollToCell,
  setCellsFocus,
  visibleColumnValues,
} from './helpers';

test.describe('virtualization', () => {
  test('renders only the visible window and reveals later rows on scroll', async ({ page }) => {
    const rowSize = 30;
    const source = buildRows(200, ['id', 'name', 'role', 'city']);
    const columns = [
      { prop: 'id', name: 'ID', size: 100 },
      { prop: 'name', name: 'Name', size: 140 },
      { prop: 'role', name: 'Role', size: 140 },
      { prop: 'city', name: 'City', size: 140 },
    ];

    await mountGrid(page, {
      columns,
      source,
      height: 260,
      rowSize,
    });

    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);
    const initialRowCount = await mainDataRows(page).count();
    expect(initialRowCount).toBeGreaterThan(0);
    expect(initialRowCount).toBeLessThan(source.length);

    await scrollToCell(page, 0, rowSize * 150);
    await expect(dataCell(page, 150, 1)).toHaveText('Name 151');

    const visibleNames = await visibleColumnValues(page, 1);
    expect(new Set(visibleNames).size).toBe(visibleNames.length);
    expect(visibleNames.includes('Name 151')).toBe(true);
  });

  test('scrolls to rows beyond browser-native scroll height limits', async ({ page }) => {
    const rowSize = 30;
    const rowCount = 1_200_000;
    const targetRow = 1_100_000;

    await page.setContent(`
      <div style="width:520px; height:260px;">
        <revo-grid style="display:block; width:100%; height:100%;"></revo-grid>
      </div>
    `);
    await page.waitForSelector(SELECTORS.grid);
    await page.evaluate(({ rowCount, rowSize }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not created');
      }
      grid.columns = [{ prop: 'id', name: 'ID', size: 120 }];
      grid.source = Array.from({ length: rowCount }, (_, index) => ({ id: index + 1 }));
      grid.rowSize = rowSize;
    }, { rowCount, rowSize });
    await page.waitForChanges();
    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);

    const logicalContentSize = await callGridMethod<{ y: number }>(page, 'getContentSize');
    const physicalScrollHeight = await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .evaluate((el: HTMLElement) => el.scrollHeight);
    expect(physicalScrollHeight).toBeLessThan(logicalContentSize.y);

    await callGridMethod(page, 'scrollToRow', targetRow);
    await page.waitForChanges();

    const cell = dataCell(page, targetRow, 0);
    await expect(cell).toHaveText(String(targetRow + 1));

    await setCellsFocus(page, { x: 0, y: targetRow });
    const focus = page.locator(SELECTORS.focusedCell);
    await expect(focus).toBeVisible();
    const cellBox = await cell.boundingBox();
    const focusBox = await focus.boundingBox();
    expect(cellBox).not.toBeNull();
    expect(focusBox).not.toBeNull();
    expect(Math.abs(cellBox!.x - focusBox!.x)).toBeLessThan(2);
    expect(Math.abs(cellBox!.y - focusBox!.y)).toBeLessThan(2);
  });

  test('maps native physical scroll and wheel deltas to logical vertical coordinates', async ({ page }) => {
    const rowSize = 30;
    const rowCount = 1_200_000;

    await page.setContent(`
      <div style="width:520px; height:260px;">
        <revo-grid style="display:block; width:100%; height:100%;"></revo-grid>
      </div>
    `);
    await page.waitForSelector(SELECTORS.grid);
    await page.evaluate(({ rowCount, rowSize }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not created');
      }
      (window as any).__viewportScrolls = [];
      grid.addEventListener('viewportscroll', ((event: CustomEvent) => {
        (window as any).__viewportScrolls.push({
          coordinate: event.detail.coordinate,
          dimension: event.detail.dimension,
        });
      }) as EventListener);
      grid.columns = [{ prop: 'id', name: 'ID', size: 120 }];
      grid.source = Array.from({ length: rowCount }, (_, index) => ({ id: index + 1 }));
      grid.rowSize = rowSize;
    }, { rowCount, rowSize });
    await page.waitForChanges();
    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);

    const logicalContentSize = await callGridMethod<{ y: number }>(page, 'getContentSize');
    const nativeScroll = await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .evaluate((el: HTMLElement) => {
        const physicalScrollSize = el.scrollHeight - el.clientHeight;
        const coordinate = Math.floor(physicalScrollSize / 2);
        el.scrollTop = coordinate;
        el.dispatchEvent(new Event('scroll', { bubbles: true }));
        return {
          clientSize: el.clientHeight,
          coordinate,
          physicalScrollSize,
        };
      });
    expect(nativeScroll.physicalScrollSize).toBeGreaterThan(0);
    expect(nativeScroll.physicalScrollSize).toBeLessThan(logicalContentSize.y);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const scrolls = ((window as any).__viewportScrolls || [])
            .filter((event: { dimension: string }) => event.dimension === 'rgRow');
          return scrolls.at(-1)?.coordinate ?? -1;
        }),
      )
      .toBeGreaterThan(nativeScroll.coordinate);

    const lastLogicalCoordinate = await page.evaluate(() => {
      const scrolls = ((window as any).__viewportScrolls || [])
        .filter((event: { dimension: string }) => event.dimension === 'rgRow');
      return scrolls.at(-1)?.coordinate ?? 0;
    });
    const expectedLogicalCoordinate =
      (nativeScroll.coordinate / nativeScroll.physicalScrollSize) *
      (logicalContentSize.y - nativeScroll.clientSize);
    expect(Math.abs(lastLogicalCoordinate - expectedLogicalCoordinate)).toBeLessThan(rowSize * 2);

    const expectedRow = Math.floor(lastLogicalCoordinate / rowSize);
    await expect(dataCell(page, expectedRow, 0)).toHaveText(String(expectedRow + 1));

    const scrollCount = await page.evaluate(() =>
      ((window as any).__viewportScrolls || [])
        .filter((event: { dimension: string }) => event.dimension === 'rgRow')
        .length,
    );
    await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .dispatchEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
      });

    await expect
      .poll(() =>
        page.evaluate(() =>
          ((window as any).__viewportScrolls || [])
            .filter((event: { dimension: string }) => event.dimension === 'rgRow')
            .length,
        ),
      )
      .toBeGreaterThan(scrollCount);
    const afterWheelCoordinate = await page.evaluate(() => {
      const scrolls = ((window as any).__viewportScrolls || [])
        .filter((event: { dimension: string }) => event.dimension === 'rgRow');
      return scrolls.at(-1)?.coordinate ?? 0;
    });
    const actualWheelLogicalDelta = afterWheelCoordinate - lastLogicalCoordinate;
    expect(Math.abs(actualWheelLogicalDelta - 120)).toBeLessThan(rowSize * 2);
  });

  test('keeps deep-scroll row interactions aligned after scroll-space compression', async ({ page }) => {
    const rowSize = 30;
    const rowCount = 1_200_000;
    const targetRow = 1_100_000;

    await page.setContent(`
      <div style="width:640px; height:320px;">
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
        { prop: 'name', name: 'Name', size: 150, rowDrag: true },
        { prop: 'role', name: 'Role', size: 150 },
        { prop: 'city', name: 'City', size: 150 },
      ];
      grid.source = Array.from({ length: rowCount }, (_, index) => ({
        name: `Name ${index + 1}`,
        role: `Role ${index + 1}`,
        city: `City ${index + 1}`,
      }));
      grid.rowSize = rowSize;
      grid.range = true;
    }, { rowCount, rowSize });
    await page.waitForChanges();
    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);

    await callGridMethod(page, 'scrollToRow', targetRow);
    await page.waitForChanges();
    await expect(dataCell(page, targetRow, 0)).toHaveText(`Name ${targetRow + 1}`);

    const focusTarget = dataCell(page, targetRow, 1);
    const focusBoxTarget = await focusTarget.boundingBox();
    expect(focusBoxTarget).not.toBeNull();
    await page.mouse.click(
      focusBoxTarget!.x + focusBoxTarget!.width / 2,
      focusBoxTarget!.y + focusBoxTarget!.height / 2,
    );
    await page.waitForChanges();
    await expect.poll(() => getFocused(page)).toMatchObject({
      cell: { x: 1, y: targetRow },
    });

    const focus = page.locator(SELECTORS.focusedCell);
    const focusedBox = await focus.boundingBox();
    expect(focusedBox).not.toBeNull();
    expect(Math.abs(focusBoxTarget!.x - focusedBox!.x)).toBeLessThan(2);
    expect(Math.abs(focusBoxTarget!.y - focusedBox!.y)).toBeLessThan(2);

    const rangeEnd = dataCell(page, targetRow + 1, 2);
    const rangeEndBox = await rangeEnd.boundingBox();
    expect(rangeEndBox).not.toBeNull();
    await page.mouse.move(
      focusBoxTarget!.x + focusBoxTarget!.width / 2,
      focusBoxTarget!.y + focusBoxTarget!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      rangeEndBox!.x + rangeEndBox!.width / 2,
      rangeEndBox!.y + rangeEndBox!.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForChanges();
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: 1,
      y: targetRow,
      x1: 2,
      y1: targetRow + 1,
    });

    const copiedText = await getCopiedText(page);
    expect(copiedText).toBe(
      `Role ${targetRow + 1}\tCity ${targetRow + 1}\nRole ${targetRow + 2}\tCity ${targetRow + 2}`,
    );

    await setCellsFocus(page, { x: 1, y: targetRow + 2 });
    await dispatchClipboardEvent(page, 'paste', 'QA\tLisbon');
    await expect(dataCell(page, targetRow + 2, 1)).toHaveText('QA');
    await expect(dataCell(page, targetRow + 2, 2)).toHaveText('Lisbon');

    await editCellValue(page, targetRow + 3, 'name', 'Edited deep row');
    await expect(dataCell(page, targetRow + 3, 0)).toHaveText('Edited deep row');

    const beforeReorder = await visibleColumnValues(page, 0);
    const dragHandle = dataCell(page, targetRow + 4, 0).locator('.revo-draggable');
    const dropTarget = dataCell(page, targetRow + 6, 0);
    const dragBox = await dragHandle.boundingBox();
    const dropBox = await dropTarget.boundingBox();
    expect(dragBox).not.toBeNull();
    expect(dropBox).not.toBeNull();
    await page.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      dropBox!.x + dropBox!.width / 2,
      dropBox!.y + dropBox!.height + 12,
      { steps: 12 },
    );
    await page.mouse.up();
    await page.waitForChanges();
    await expect.poll(() => visibleColumnValues(page, 0)).not.toEqual(beforeReorder);
  });

  test('keeps deep horizontal scroll interactions aligned after scroll-space compression', async ({ page }) => {
    const colSize = 300;
    const colCount = 120_000;
    const targetColumn = 110_000;
    const interactionColumn = targetColumn + 2;

    await page.setContent(`
      <div style="width:780px; height:260px;">
        <revo-grid can-move-columns style="display:block; width:100%; height:100%;"></revo-grid>
      </div>
    `);
    await page.waitForSelector(SELECTORS.grid);
    await page.evaluate(({ colCount, colSize, interactionColumn, targetColumn }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not created');
      }
      const cellParser = (model: Record<string, string | number>, column: { prop: string }) =>
        model[column.prop] ?? `Row ${model.row} ${column.prop}`;
      grid.addEventListener('columndragend', ((event: CustomEvent) => {
        const columns = event.detail.columns as Array<{ prop: string }>;
        (window as any).__columnDragEnd = {
          type: event.detail.type,
          changedNearTarget: columns[interactionColumn]?.prop !== `c${interactionColumn}`,
          nextProp: columns[interactionColumn + 1]?.prop,
        };
      }) as EventListener);
      grid.columns = Array.from({ length: colCount }, (_, index) => ({
        prop: `c${index}`,
        name: `C ${index}`,
        size: colSize,
        cellParser,
      }));
      grid.source = Array.from({ length: 3 }, (_, index) => {
        const row: Record<string, string | number> = { row: index + 1 };
        for (let column = interactionColumn; column <= interactionColumn + 2; column++) {
          row[`c${column}`] = `Row ${index + 1} c${column}`;
        }
        return row;
      });
      grid.range = true;
      grid.canMoveColumns = true;
      grid.colSize = colSize;
    }, { colCount, colSize, interactionColumn, targetColumn });
    await page.waitForChanges();
    await expect.poll(() => mainDataRows(page).count()).toBeGreaterThan(0);

    const logicalContentSize = await callGridMethod<{ x: number }>(page, 'getContentSize');
    const physicalScrollWidth = await page
      .locator(SELECTORS.mainViewport)
      .evaluate((el: HTMLElement) => el.scrollWidth);
    expect(physicalScrollWidth).toBeLessThan(logicalContentSize.x);

    await callGridMethod(page, 'scrollToColumnIndex', targetColumn);
    await page.waitForChanges();
    await expect(dataCell(page, 0, targetColumn)).toHaveText(`Row 1 c${targetColumn}`);

    await callGridMethod(page, 'scrollToCoordinate', { x: interactionColumn * colSize });
    await page.waitForChanges();

    const header = page.locator(
      `${SELECTORS.mainViewport} revogr-header .header-rgRow.actual-rgRow [data-rgcol="${interactionColumn}"]`,
    );
    const cell = dataCell(page, 0, interactionColumn);
    await expect(header).toHaveText(`C ${interactionColumn}`);
    await expect(cell).toHaveText(`Row 1 c${interactionColumn}`);

    const cellBox = await cell.boundingBox();
    expect(cellBox).not.toBeNull();
    await page.mouse.click(
      cellBox!.x + cellBox!.width / 2,
      cellBox!.y + cellBox!.height / 2,
    );
    await page.waitForChanges();
    await expect.poll(() => getFocused(page)).toMatchObject({
      cell: { x: interactionColumn, y: 0 },
    });

    const focus = page.locator(SELECTORS.focusedCell);
    const focusBox = await focus.boundingBox();
    expect(focusBox).not.toBeNull();
    expect(Math.abs(cellBox!.x - focusBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(cellBox!.y - focusBox!.y)).toBeLessThanOrEqual(2);

    const rangeEnd = dataCell(page, 1, interactionColumn + 1);
    const rangeEndBox = await rangeEnd.boundingBox();
    expect(rangeEndBox).not.toBeNull();
    await page.mouse.move(
      cellBox!.x + cellBox!.width / 2,
      cellBox!.y + cellBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      rangeEndBox!.x + rangeEndBox!.width / 2,
      rangeEndBox!.y + rangeEndBox!.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForChanges();
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x: interactionColumn,
      y: 0,
      x1: interactionColumn + 1,
      y1: 1,
    });

    const copiedText = await getCopiedText(page);
    expect(copiedText).toBe(
      [
        `Row 1 c${interactionColumn}\tRow 1 c${interactionColumn + 1}`,
        `Row 2 c${interactionColumn}\tRow 2 c${interactionColumn + 1}`,
      ].join('\n'),
    );

    await setCellsFocus(page, { x: interactionColumn + 2, y: 2 });
    await dispatchClipboardEvent(page, 'paste', 'Horizontal Paste');
    await expect(dataCell(page, 2, interactionColumn + 2)).toHaveText('Horizontal Paste');

    await editCellValue(
      page,
      0,
      `c${interactionColumn + 2}`,
      'Edited horizontal cell',
    );
    await expect(dataCell(page, 0, interactionColumn + 2)).toHaveText('Edited horizontal cell');

    const fromHeader = page.locator(
      `${SELECTORS.mainViewport} revogr-header .header-rgRow.actual-rgRow [data-rgcol="${interactionColumn + 1}"]`,
    );
    const toHeader = page.locator(
      `${SELECTORS.mainViewport} revogr-header .header-rgRow.actual-rgRow [data-rgcol="${interactionColumn}"]`,
    );
    const fromBox = await fromHeader.boundingBox();
    const toBox = await toHeader.boundingBox();
    expect(fromBox).not.toBeNull();
    expect(toBox).not.toBeNull();
    await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox!.x + 4, toBox!.y + toBox!.height / 2, {
      steps: 12,
    });
    await page.mouse.up();

    await expect
      .poll(() => page.evaluate(() => (window as any).__columnDragEnd))
      .toEqual({
        type: 'rgCol',
        changedNearTarget: true,
        nextProp: `c${interactionColumn}`,
      });
  });
});
