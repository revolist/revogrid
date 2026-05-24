import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  callGridMethod,
  dataCell,
  mountGrid,
  rowHeaderCell,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('row headers', () => {
  test('renders row headers correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 601, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 602, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 603, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('row-header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('row-header-name') },
      { prop: 'role', name: 'Role', ...withHeaderTestId('row-header-role') },
    ]);

    await mountGrid(page, {
      columns,
      source,
      rowHeaders: { size: 60, __cellTestIds: true },
    });

    await expect(page.locator(SELECTORS.rowHeaderViewport)).toBeVisible();
    await expect(page.getByTestId('row-header-0')).toBeVisible();
    await expect(page.getByTestId('row-header-1')).toBeVisible();
    await expect(page.getByTestId('row-header-2')).toBeVisible();

    await expect(page.getByTestId('row-header-0')).toHaveText('1');
    await expect(page.getByTestId('row-header-1')).toHaveText('2');
    await expect(page.getByTestId('row-header-2')).toHaveText('3');

    await expect(rowHeaderCell(page, 0)).toHaveText('1');
    await expect(rowHeaderCell(page, 1)).toHaveText('2');
    await expect(rowHeaderCell(page, 2)).toHaveText('3');
    await expect(dataCell(page, 0, 1)).toHaveText('Alice');
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
    await expect(dataCell(page, 2, 1)).toHaveText('Cara');
  });

  test('keeps row headers aligned after compressed deep row scroll', async ({ page }) => {
    const rowSize = 30;
    const rowCount = 1_200_000;
    const targetRow = 1_100_000;

    await page.setContent(`
      <div style="width:560px; height:300px;">
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
        { prop: 'name', name: 'Name', size: 160 },
        { prop: 'role', name: 'Role', size: 160 },
      ];
      grid.source = Array.from({ length: rowCount }, (_, index) => ({
        name: `Name ${index + 1}`,
        role: `Role ${index + 1}`,
      }));
      grid.rowHeaders = { size: 70 };
      grid.rowSize = rowSize;
    }, { rowCount, rowSize });
    await page.waitForChanges();

    const logicalContentSize = await callGridMethod<{ y: number }>(page, 'getContentSize');
    const physicalScrollHeight = await page
      .locator(`${SELECTORS.mainViewport} .vertical-inner`)
      .evaluate((el: HTMLElement) => el.scrollHeight);
    expect(physicalScrollHeight).toBeLessThan(logicalContentSize.y);

    await callGridMethod(page, 'scrollToRow', targetRow);
    await page.waitForChanges();

    const header = rowHeaderCell(page, targetRow);
    const cell = dataCell(page, targetRow, 0);
    await expect(header).toHaveText(String(targetRow + 1));
    await expect(cell).toHaveText(`Name ${targetRow + 1}`);

    const headerBox = await header.boundingBox();
    const cellBox = await cell.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(cellBox).not.toBeNull();
    expect(Math.abs(headerBox!.y - cellBox!.y)).toBeLessThan(2);
  });
});
