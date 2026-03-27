import { expect } from '@playwright/test';
import type { E2EPage } from '@stencil/playwright';
import { SELECTORS } from './selectors';
import type { GridSetupOptions } from './types';

type BrowserGridHelpers = {
  rowHeaderCellProperties: ({ rowIndex }: { rowIndex: number }) => { 'data-testid': string };
  toColumnProperties: (testId: string) => () => { 'data-testid': string };
};

function installBrowserGridHelpers() {
  const browserGlobals = globalThis as typeof globalThis & { __revoGridE2EHelpers?: BrowserGridHelpers };
  if (browserGlobals.__revoGridE2EHelpers) {
    return;
  }

  browserGlobals.__revoGridE2EHelpers = {
    toColumnProperties(testId: string) {
      return () => ({ 'data-testid': testId });
    },
    rowHeaderCellProperties({ rowIndex }: { rowIndex: number }) {
      return { 'data-testid': `row-header-${rowIndex}` };
    },
  };
}

export async function mountGrid(page: E2EPage, options: GridSetupOptions) {
  const width = options.width ?? 900;
  const height = options.height ?? 360;
  const initialAttrs = [
    options.filter ? 'filter' : '',
    options.exporting ? 'exporting' : '',
    options.canMoveColumns ? 'can-move-columns' : '',
  ]
    .filter(Boolean)
    .join(' ');

  await page.addInitScript(installBrowserGridHelpers);
  await page.setContent(`
    <div style="width:${width}px; height:${height}px;">
      <revo-grid ${initialAttrs} style="display:block; width:100%; height:100%;"></revo-grid>
    </div>
  `);

  await page.waitForSelector(SELECTORS.grid);

  await page.evaluate((config: GridSetupOptions) => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid element was not created');
    const browserGlobals = globalThis as typeof globalThis & { __revoGridE2EHelpers?: BrowserGridHelpers };
    const helpers = browserGlobals.__revoGridE2EHelpers;
    if (!helpers) throw new Error('Grid E2E helpers were not installed');

    const {
      columns,
      source,
      filter,
      rowHeaders,
      pinnedTopSource,
      pinnedBottomSource,
      range,
      resize,
      readonly,
      canMoveColumns,
      grouping,
      trimmedRows,
      rtl,
      theme,
      exporting,
      rowSize,
      colSize,
    } = config;

    function applyColumn(column: any): any {
      const next = { ...column };
      if (next.__testId) {
        next.columnProperties = helpers.toColumnProperties(next.__testId);
      }
      if (Array.isArray(next.children)) {
        next.children = next.children.map(applyColumn);
      }
      return next;
    }

    grid.columns = columns.map(applyColumn);
    grid.source = source;
    grid.filter = filter ?? false;
    grid.pinnedTopSource = pinnedTopSource ?? [];
    grid.pinnedBottomSource = pinnedBottomSource ?? [];
    grid.range = range ?? false;
    grid.resize = resize ?? false;
    grid.readonly = readonly ?? false;
    grid.canMoveColumns = canMoveColumns ?? false;
    grid.grouping = grouping as any;
    grid.trimmedRows = trimmedRows ?? {};
    grid.rtl = rtl ?? false;
    grid.theme = (theme as any) ?? 'default';
    grid.exporting = exporting ?? false;
    grid.rowSize = rowSize ?? 0;
    grid.colSize = colSize ?? 100;
    if (rowHeaders && typeof rowHeaders === 'object') {
      const { __cellTestIds, ...rowHeaderConfig } = rowHeaders;
      grid.rowHeaders = {
        ...rowHeaderConfig,
        ...(__cellTestIds && { cellProperties: helpers.rowHeaderCellProperties }),
      } as any;
    } else {
      grid.rowHeaders = rowHeaders ?? false;
    }
  }, options);

  await page.waitForChanges();
  await expect(page.locator(SELECTORS.grid)).toBeVisible();
}

export async function callGridMethod<T = unknown>(
  page: E2EPage,
  method: string,
  ...args: unknown[]
): Promise<T> {
  return page.evaluate(
    async ({ methodName, methodArgs }) => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) {
        throw new Error('Grid element was not found');
      }
      const fn = (grid as any)[methodName];
      if (typeof fn !== 'function') {
        throw new TypeError(`Grid method "${methodName}" was not found`);
      }
      return await fn.apply(grid, methodArgs);
    },
    { methodName: method, methodArgs: args },
  ) as Promise<T>;
}

export async function scrollToCell(page: E2EPage, x: number, y: number): Promise<void> {
  await callGridMethod(page, 'scrollToCoordinate', { x, y });
  await page.waitForChanges();
}

export async function setCellEdit(page: E2EPage, rowIndex: number, prop: string | number): Promise<void> {
  await callGridMethod(page, 'setCellEdit', rowIndex, prop);
  await page.waitForChanges();
}

export async function setCellsFocus(
  page: E2EPage,
  start: { x: number; y: number },
  end = start,
): Promise<void> {
  await callGridMethod(page, 'setCellsFocus', start, end);
  await page.waitForChanges();
}

export async function getFocused(page: E2EPage) {
  return callGridMethod<{
    cell: { x: number; y: number };
    colType: string;
    rowType: string;
  } | null>(page, 'getFocused');
}

export async function getSelectedRange(page: E2EPage) {
  return callGridMethod<{
    x: number;
    y: number;
    x1: number;
    y1: number;
    colType: string;
    rowType: string;
  } | null>(page, 'getSelectedRange');
}

export async function getVisibleSource<T = Record<string, unknown>>(page: E2EPage, type = 'rgRow') {
  return callGridMethod<T[]>(page, 'getVisibleSource', type);
}
