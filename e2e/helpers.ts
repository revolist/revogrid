import { expect } from '@playwright/test';
import type { E2ELocator, E2EPage } from '@stencil/playwright';
import type { ColumnData, ColumnFilterConfig, RowHeaders } from '../src';

export const SELECTORS = {
  grid: 'revo-grid',
  mainViewport: 'revo-grid revogr-viewport-scroll:not([row-header])',
  rowHeaderViewport: 'revo-grid revogr-viewport-scroll[row-header]',
  actualHeaderCells:
    'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
  renderedRows: 'revogr-data[type="rgRow"] .rgRow',
  filterButton: '.rv-filter',
  filterPanel: 'revogr-filter-panel',
  filterInput: 'revogr-filter-panel input[placeholder="Enter value..."]',
} as const;

export type SampleRow = {
  id: number;
  name: string;
  role: string;
  city: string;
};

export type GridSetupOptions = {
  columns: ColumnData;
  source: SampleRow[];
  filter?: boolean | ColumnFilterConfig;
  rowHeaders?: boolean | (Partial<RowHeaders> & { __cellTestIds?: boolean });
  width?: number;
  height?: number;
};

export const withHeaderTestId = (
  testId: string,
  extra: Record<string, unknown> = {},
) => ({
  __testId: testId,
  ...extra,
});

export function buildColumns(columns: ColumnData): ColumnData {
  return columns.map(column => {
    if (Array.isArray((column as any).children)) {
      return {
        ...column,
        children: buildColumns((column as any).children),
      };
    }
    return { ...column };
  });
}

export async function mountGrid(page: E2EPage, options: GridSetupOptions) {
  const width = options.width ?? 900;
  const height = options.height ?? 360;

  await page.setContent(`
    <div style="width:${width}px; height:${height}px;">
      <revo-grid filter style="display:block; width:100%; height:100%;"></revo-grid>
    </div>
  `);

  await page.waitForSelector(SELECTORS.grid);

  await page.evaluate(({ columns, source, filter, rowHeaders }: GridSetupOptions) => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid element was not created');

    function toColumnProperties(testId: string) {
      return () => ({ 'data-testid': testId });
    }

    function applyColumn(column: any): any {
      const next = { ...column };
      if (next.__testId) {
        next.columnProperties = toColumnProperties(next.__testId);
      }
      if (Array.isArray(next.children)) {
        next.children = next.children.map(applyColumn);
      }
      return next;
    }

    function rowHeaderCellProperties({ rowIndex }: { rowIndex: number }) {
      return { 'data-testid': `row-header-${rowIndex}` };
    }

    grid.columns = columns.map(applyColumn);
    grid.source = source;
    grid.filter = filter ?? false;
    if (rowHeaders && typeof rowHeaders === 'object') {
      const { __cellTestIds, ...rowHeaderConfig } = rowHeaders;
      grid.rowHeaders = {
        ...rowHeaderConfig,
        ...(__cellTestIds && { cellProperties: rowHeaderCellProperties }),
      } as RowHeaders;
    } else {
      grid.rowHeaders = rowHeaders ?? false;
    }
  }, options);

  await page.waitForChanges();
  await expect(page.locator(SELECTORS.grid)).toBeVisible();
}

export function mainDataRows(page: E2EPage): E2ELocator {
  return page.locator(`${SELECTORS.mainViewport} ${SELECTORS.renderedRows}`);
}

export function dataCell(page: E2EPage, rowIndex: number, columnIndex: number): E2ELocator {
  return page.locator(
    `${SELECTORS.mainViewport} [data-rgRow="${rowIndex}"][data-rgCol="${columnIndex}"]`,
  );
}

export function rowHeaderCell(page: E2EPage, rowIndex: number): E2ELocator {
  return page.locator(
    `${SELECTORS.rowHeaderViewport} [data-rgRow="${rowIndex}"][data-rgCol="0"]`,
  );
}

export async function visibleColumnValues(page: E2EPage, columnIndex: number): Promise<string[]> {
  const values = await page
    .locator(`${SELECTORS.mainViewport} .rgRow [data-rgCol="${columnIndex}"]`)
    .allTextContents();
  return values.map((v: string) => v.trim()).filter(Boolean);
}

export async function expectVisibleColumnValues(
  page: E2EPage,
  columnIndex: number,
  expected: string[],
): Promise<void> {
  await expect
    .poll(() => visibleColumnValues(page, columnIndex))
    .toEqual(expected);
}

export async function expectChildHeaderUnderGroup(
  page: E2EPage,
  childHeaderTestId: string,
  groupHeaderTestId: string,
): Promise<void> {
  const childBox = await page.getByTestId(childHeaderTestId).boundingBox();
  const groupBox = await page.getByTestId(groupHeaderTestId).boundingBox();

  expect(childBox).not.toBeNull();
  expect(groupBox).not.toBeNull();
  expect(childBox!.x).toBeGreaterThanOrEqual(groupBox!.x);
  expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(
    groupBox!.x + groupBox!.width,
  );
}
