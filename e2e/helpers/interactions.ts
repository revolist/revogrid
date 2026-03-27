import { expect } from '@playwright/test';
import type { E2EPage } from '@stencil/playwright';
import { SELECTORS } from './selectors';
import { setCellEdit } from './grid';

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
