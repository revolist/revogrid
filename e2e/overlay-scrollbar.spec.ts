import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid } from './helpers';

for (const axis of ['vertical', 'horizontal'] as const) {
  test(`overlay ${axis} scrollbar remains reachable while idle`, async ({
    page,
  }) => {
    await mountGrid(
      page,
      {
        columns: Array.from({ length: 10 }, (_, i) => ({
          prop: `c${i}`,
          size: 150,
        })),
        source: Array.from({ length: 100 }, (_, id) => ({ c0: id })),
        width: 400,
        height: 240,
      },
      '* { scrollbar-width: none; }',
    );
    const scrollbar = page.locator(`revogr-scroll-virtual.${axis}`);
    const vertical = axis === 'vertical';
    const size = () =>
      scrollbar.evaluate((el, vertical) => {
        const rect = el.getBoundingClientRect();
        return vertical ? rect.width : rect.height;
      }, vertical);
    await expect(scrollbar).toHaveCSS('scrollbar-width', 'none');
    await expect(scrollbar).toHaveAttribute('autohide', 'true');
    await page.mouse.move(0, 0);
    await expect(scrollbar).not.toHaveAttribute('visible');
    await expect.poll(size).toBeGreaterThanOrEqual(8);
    const bounds = (await scrollbar.boundingBox())!;
    const point = vertical
      ? { x: bounds.x + bounds.width - 4, y: bounds.y + bounds.height / 2 }
      : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 4 };
    expect(
      await scrollbar.evaluate(
        (el, point) => el.contains(document.elementFromPoint(point.x, point.y)),
        point,
      ),
    ).toBe(true);
    await page.mouse.move(point.x, point.y);
    await expect.poll(size).toBeGreaterThanOrEqual(20);

    // Drag from the original idle strip, outside any native scrollbar pixels.
    await page.mouse.down();
    await page.mouse.move(
      point.x + (vertical ? 0 : 30),
      point.y + (vertical ? 30 : 0),
    );
    await page.mouse.up();
    await expect(scrollbar).toHaveAttribute('visible', 'true');
    await expect
      .poll(() =>
        scrollbar.evaluate(
          (el, vertical) => (vertical ? el.scrollTop : el.scrollLeft),
          vertical,
        ),
      )
      .toBeGreaterThan(0);
    // The timed visible state must not collapse a scrollbar still under the pointer.
    await expect(scrollbar).not.toHaveAttribute('visible', { timeout: 3000 });
    await expect.poll(size).toBeGreaterThanOrEqual(20);
    await page.mouse.move(0, 0);
    await expect.poll(size).toBe(8);

    // No hit area should cover the cells once this axis has no overflow.
    await page.evaluate(vertical => {
      const grid = document.querySelector('revo-grid')!;
      if (vertical) grid.source = [{ c0: 0 }];
      else grid.columns = [{ prop: 'c0', size: 150 }];
    }, vertical);
    await expect(scrollbar).not.toHaveAttribute('scrollable');
    await expect.poll(size).toBeLessThanOrEqual(1);
  });
}
