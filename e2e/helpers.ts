import { expect } from '@playwright/test';
import type { E2ELocator, E2EPage } from '@stencil/playwright';
import type { ColumnData, ColumnFilterConfig, RowHeaders } from '../src';

export const SELECTORS = {
  grid: 'revo-grid',
  mainViewport: 'revo-grid revogr-viewport-scroll.rgCol:not([row-header])',
  pinnedStartViewport: 'revo-grid revogr-viewport-scroll.colPinStart',
  pinnedEndViewport: 'revo-grid revogr-viewport-scroll.colPinEnd',
  rowHeaderViewport: 'revo-grid revogr-viewport-scroll[row-header]',
  actualHeaderCells:
    'revo-grid revogr-header .header-rgRow.actual-rgRow .rgHeaderCell',
  renderedRows: 'revogr-data[type="rgRow"] .rgRow',
  pinnedTopRows: 'revogr-data[type="rowPinStart"] .rgRow',
  pinnedBottomRows: 'revogr-data[type="rowPinEnd"] .rgRow',
  filterButton: '.rv-filter',
  filterPanel: 'revogr-filter-panel',
  filterInput: 'revogr-filter-panel input[placeholder="Enter value..."]',
  editInput: 'revo-grid revogr-edit input',
  focusedCell: 'revo-grid revogr-focus.focused-cell',
  selectedRange: '.selection-border-range',
  groupRows: 'revo-grid .groupingRow',
  groupExpandButton: '.group-expand',
} as const;

export type SampleRow = {
  id: number;
  name: string;
  role: string;
  city: string;
};

export const SAMPLE_ROWS = {
  pair: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
  ] as SampleRow[],
  trio: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
  ] as SampleRow[],
  quartet: [
    { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
    { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
    { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra' },
  ] as SampleRow[],
} as const;

export type GridSetupOptions = {
  columns: ColumnData;
  source: Record<string, unknown>[];
  filter?: boolean | ColumnFilterConfig;
  rowHeaders?: boolean | (Partial<RowHeaders> & { __cellTestIds?: boolean });
  pinnedTopSource?: Record<string, unknown>[];
  pinnedBottomSource?: Record<string, unknown>[];
  range?: boolean;
  resize?: boolean;
  readonly?: boolean;
  canMoveColumns?: boolean;
  grouping?: Record<string, unknown>;
  trimmedRows?: Record<number, boolean>;
  rtl?: boolean;
  theme?: string;
  exporting?: boolean;
  rowSize?: number;
  colSize?: number;
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

export function basicColumns(
  props: Array<'id' | 'name' | 'role' | 'city'> = ['id', 'name', 'role', 'city'],
): ColumnData {
  const names = {
    id: 'ID',
    name: 'Name',
    role: 'Role',
    city: 'City',
  } as const;
  return buildColumns(props.map(prop => ({ prop, name: names[prop] })));
}

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
  const initialAttrs = [
    options.filter ? 'filter' : '',
    options.exporting ? 'exporting' : '',
    options.canMoveColumns ? 'can-move-columns' : '',
  ]
    .filter(Boolean)
    .join(' ');

  await page.setContent(`
    <div style="width:${width}px; height:${height}px;">
      <revo-grid ${initialAttrs} style="display:block; width:100%; height:100%;"></revo-grid>
    </div>
  `);

  await page.waitForSelector(SELECTORS.grid);

  await page.evaluate((config: GridSetupOptions) => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) throw new Error('Grid element was not created');

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
        ...(__cellTestIds && { cellProperties: rowHeaderCellProperties }),
      } as any;
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

export function pinnedStartCell(page: E2EPage, rowIndex: number, columnIndex = 0): E2ELocator {
  return page.locator(
    `${SELECTORS.pinnedStartViewport} [data-rgRow="${rowIndex}"][data-rgCol="${columnIndex}"]`,
  );
}

export function pinnedEndCell(page: E2EPage, rowIndex: number, columnIndex = 0): E2ELocator {
  return page.locator(
    `${SELECTORS.pinnedEndViewport} [data-rgRow="${rowIndex}"][data-rgCol="${columnIndex}"]`,
  );
}

export function pinnedTopCell(page: E2EPage, rowIndex: number, columnIndex: number): E2ELocator {
  return page.locator(
    `${SELECTORS.mainViewport} revogr-data[type="rowPinStart"] [data-rgRow="${rowIndex}"][data-rgCol="${columnIndex}"]`,
  );
}

export function pinnedBottomCell(page: E2EPage, rowIndex: number, columnIndex: number): E2ELocator {
  return page.locator(
    `${SELECTORS.mainViewport} revogr-data[type="rowPinEnd"] [data-rgRow="${rowIndex}"][data-rgCol="${columnIndex}"]`,
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

export function buildRows(count: number, columns: string[] = ['id', 'name', 'role', 'city']) {
  return Array.from({ length: count }, (_, index) => {
    const row: Record<string, unknown> = {
      id: index + 1,
      name: `Name ${index + 1}`,
      role: `Role ${index + 1}`,
      city: `City ${index + 1}`,
      group: index % 2 === 0 ? 'A' : 'B',
      team: index < count / 2 ? 'North' : 'South',
    };
    columns.forEach((column, columnIndex) => {
      if (!(column in row)) {
        row[column] = `R${index + 1}C${columnIndex + 1}`;
      }
    });
    return row;
  });
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
        throw new Error(`Grid method "${methodName}" was not found`);
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

export async function expectFocusedCell(
  page: E2EPage,
  cell: { x: number; y: number },
): Promise<void> {
  await expect.poll(() => getFocused(page)).toMatchObject({
    cell,
  });
  await expect(page.locator(SELECTORS.focusedCell)).toBeVisible();
}

export async function expectSelectedRange(
  page: E2EPage,
  range: { x: number; y: number; x1: number; y1: number },
): Promise<void> {
  await expect.poll(() => getSelectedRange(page)).toMatchObject(range);
  await expect(page.locator(SELECTORS.selectedRange)).toBeVisible();
}

export async function editCellValue(
  page: E2EPage,
  rowIndex: number,
  prop: string | number,
  value: string,
  commitWith: 'Enter' | 'Tab' = 'Enter',
): Promise<void> {
  await setCellEdit(page, rowIndex, prop);
  await expect(page.locator(SELECTORS.editInput)).toBeVisible();
  await page.locator(SELECTORS.editInput).fill(value);
  await page.locator(SELECTORS.editInput).press(commitWith);
  await page.waitForChanges();
}

export async function cancelEditCellValue(
  page: E2EPage,
  rowIndex: number,
  prop: string | number,
  value: string,
): Promise<void> {
  await setCellEdit(page, rowIndex, prop);
  await expect(page.locator(SELECTORS.editInput)).toBeVisible();
  await page.locator(SELECTORS.editInput).fill(value);
  await page.locator(SELECTORS.editInput).press('Escape');
  await page.waitForChanges();
}

export async function visibleHeaderTexts(page: E2EPage): Promise<string[]> {
  const values = await page.locator(SELECTORS.actualHeaderCells).allTextContents();
  return values.map(value => value.trim()).filter(Boolean);
}

export async function dispatchClipboardEvent(
  page: E2EPage,
  type: 'copy' | 'cut' | 'paste',
  text = '',
): Promise<void> {
  await page.evaluate(({ eventType, eventText }) => {
    class DataTransferStub {
      data: Record<string, string> = {};
      types: string[] = [];

      setData(type: string, value: string) {
        this.data[type] = value;
        if (type === 'text/plain') {
          this.data.text = value;
        }
        if (type === 'text') {
          this.data['text/plain'] = value;
        }
        if (!this.types.includes(type)) {
          this.types.push(type);
        }
        if (type === 'text/plain' && !this.types.includes('text')) {
          this.types.push('text');
        }
      }

      getData(type: string) {
        if (type === 'text') {
          return this.data.text ?? this.data['text/plain'] ?? '';
        }
        if (type === 'text/plain') {
          return this.data['text/plain'] ?? this.data.text ?? '';
        }
        return this.data[type] ?? '';
      }
    }

    const clipboardData = new DataTransferStub();
    if (eventType === 'paste') {
      clipboardData.setData('text/plain', eventText);
    }
    const event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransferStub };
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
      configurable: true,
    });
    document.dispatchEvent(event);
  }, { eventType: type, eventText: text });
  await page.waitForChanges();
}

export async function getCopiedText(page: E2EPage): Promise<string> {
  return page.evaluate(async () => {
    class DataTransferStub {
      data: Record<string, string> = {};
      types: string[] = [];

      setData(type: string, value: string) {
        this.data[type] = value;
        if (type === 'text/plain') {
          this.data.text = value;
        }
        if (type === 'text') {
          this.data['text/plain'] = value;
        }
        if (!this.types.includes(type)) {
          this.types.push(type);
        }
        if (type === 'text/plain' && !this.types.includes('text')) {
          this.types.push('text');
        }
      }

      getData(type: string) {
        if (type === 'text') {
          return this.data.text ?? this.data['text/plain'] ?? '';
        }
        if (type === 'text/plain') {
          return this.data['text/plain'] ?? this.data.text ?? '';
        }
        return this.data[type] ?? '';
      }
    }

    const clipboardData = new DataTransferStub();
    const event = new Event('copy', {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData?: DataTransferStub };
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
      configurable: true,
    });
    document.dispatchEvent(event);
    await Promise.resolve();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    return clipboardData.getData('text/plain');
  });
}

export async function getExportCsv(page: E2EPage): Promise<string | null> {
  return page.evaluate(async () => {
    const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
    if (!grid) {
      throw new Error('Grid element was not found');
    }
    const plugins = await grid.getPlugins();
    const exportPlugin = plugins.find((plugin: any) => typeof (plugin as any).exportString === 'function') as any;
    if (!exportPlugin) {
      return null;
    }
    return await exportPlugin.exportString({ filename: 'e2e-export' });
  });
}

export async function dragBetweenLocators(
  page: E2EPage,
  from: { boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> },
  to: { boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> },
): Promise<void> {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();

  expect(fromBox).not.toBeNull();
  expect(toBox).not.toBeNull();

  await page.mouse.move(fromBox!.x + fromBox!.width / 2, fromBox!.y + fromBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox!.x + toBox!.width / 2, toBox!.y + toBox!.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}
