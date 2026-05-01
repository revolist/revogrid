import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { buildRows, mountGrid } from './helpers';

const SCROLL_COLUMNS = Array.from({ length: 20 }, (_, i) => ({
  prop: `col${i}`,
  name: `Column ${i}`,
  size: 120,
}));
const SCROLL_SOURCE = buildRows(50, SCROLL_COLUMNS.map(c => c.prop));

async function mountScrollGrid(page: Parameters<typeof mountGrid>[0]) {
  await mountGrid(page, {
    columns: SCROLL_COLUMNS,
    source: SCROLL_SOURCE,
    width: 600,
    height: 300,
  });
}

test.describe('scroll', () => {
  test('Shift+Wheel scrolls horizontally instead of vertically', async ({ page }) => {
    await mountScrollGrid(page);

    // Get the viewport scroll element
    const viewportScroll = page.locator('revogr-viewport-scroll').first();
    await expect(viewportScroll).toBeVisible();

    // Record initial scroll positions
    const initialScrollLeft = await viewportScroll.evaluate(
      (el: HTMLElement) => el.scrollLeft,
    );
    const verticalInner = viewportScroll.locator('.vertical-inner').first();
    const initialScrollTop = await verticalInner.evaluate(
      (el: HTMLElement) => el.scrollTop,
    );

    // Dispatch a Shift+Wheel event (as browsers like Yandex on Windows do:
    // deltaY is set, deltaX is 0, shiftKey is true)
    await viewportScroll.dispatchEvent('wheel', {
      deltaX: 0,
      deltaY: 100,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await page.waitForChanges();

    // Horizontal scroll should have advanced
    const newScrollLeft = await viewportScroll.evaluate(
      (el: HTMLElement) => el.scrollLeft,
    );
    // Vertical scroll should NOT have changed
    const newScrollTop = await verticalInner.evaluate(
      (el: HTMLElement) => el.scrollTop,
    );

    expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);
    expect(newScrollTop).toBe(initialScrollTop);
  });

  test('Wheel without Shift scrolls vertically', async ({ page }) => {
    await mountScrollGrid(page);

    const viewportScroll = page.locator('revogr-viewport-scroll').first();
    const verticalInner = viewportScroll.locator('.vertical-inner').first();

    const initialScrollLeft = await viewportScroll.evaluate(
      (el: HTMLElement) => el.scrollLeft,
    );

    // Dispatch a normal vertical wheel event (no shift key) on the vertical inner
    await verticalInner.dispatchEvent('wheel', {
      deltaX: 0,
      deltaY: 100,
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    await page.waitForChanges();

    // Wait for the scroll to be applied (requestAnimationFrame-based)
    await expect
      .poll(() => verticalInner.evaluate((el: HTMLElement) => el.scrollTop))
      .toBeGreaterThan(0);

    const newScrollLeft = await viewportScroll.evaluate(
      (el: HTMLElement) => el.scrollLeft,
    );

    // Horizontal scroll should NOT have changed
    expect(newScrollLeft).toBe(initialScrollLeft);
  });
});
