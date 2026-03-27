import type { E2ELocator, E2EPage } from '@stencil/playwright';
import { SELECTORS } from './selectors';

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

export async function visibleHeaderTexts(page: E2EPage): Promise<string[]> {
  const values = await page.locator(SELECTORS.actualHeaderCells).allTextContents();
  return values.map(value => value.trim()).filter(Boolean);
}
