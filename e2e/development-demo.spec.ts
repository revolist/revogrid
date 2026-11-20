import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { SELECTORS } from './helpers';

test('loads Revo UI dropdown styles in the development demo', async ({ page }) => {
  await page.goto('/');

  for (const name of ['Data', 'Theme', 'Pin', 'Filter', 'Sorting', 'Row grouping', 'Column grouping']) {
    const picker = page.getByRole('combobox', { name, exact: true });
    await expect(picker.locator('.dropdown-arrow svg')).toHaveCSS('width', '9px');
  }

  await page.getByRole('combobox', { name: 'Data', exact: true }).click();
  await page.getByRole('option', { name: '20 × 2', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Data', exact: true })).toHaveText('20 × 2');
  await expect.poll(() => page.locator<HTMLRevoGridElement>(SELECTORS.grid)
    .evaluate(grid => grid.source.length)).toBe(20);
});

test('starts with save-only filtering and an outlined Cancel button', async ({ page }) => {
  await page.goto('/');

  const filterButton = page.locator(SELECTORS.filterButton);
  const firstFilterableHeader = page.locator(SELECTORS.actualHeaderCells)
    .filter({ has: filterButton }).first();
  await firstFilterableHeader.hover();
  await firstFilterableHeader.locator(SELECTORS.filterButton).click();

  const panel = page.locator(SELECTORS.filterPanel);
  await expect(panel.getByRole('button', { name: 'save', exact: true })).toBeVisible();
  const cancel = panel.getByText('Cancel', { exact: true });
  await expect(cancel).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(cancel).toHaveCSS('border-top-style', 'solid');
  await expect(cancel).toHaveCSS('border-top-width', '1px');
});
