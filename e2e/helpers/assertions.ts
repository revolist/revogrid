import { expect } from '@playwright/test';
import type { E2EPage } from '@stencil/playwright';
import { SELECTORS } from './selectors';
import { getFocused, getSelectedRange } from './grid';
import { visibleColumnValues } from './locators';

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
