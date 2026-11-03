import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { mountGrid } from './helpers';

for (const axis of ['vertical', 'horizontal'] as const) {
  test(`overlay ${axis} scrollbar remains reachable while idle`, async ({
    page,
  }) => {
    // Reproduce a zero-width native gutter independently of the host OS setting.
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent =
        '* { scrollbar-width: none; } ::-webkit-scrollbar { width: 0; height: 0; }';
      if (document.head) document.head.append(style);
      else {
        const observer = new MutationObserver(() => {
          if (document.head) {
            document.head.append(style);
            observer.disconnect();
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      }
    });
    await mountGrid(page, {
      columns: Array.from({ length: 10 }, (_, i) => ({
        prop: `c${i}`,
        size: 150,
      })),
      source: Array.from({ length: 100 }, (_, id) => ({ c0: id })),
      width: 400,
      height: 240,
    });
    const scrollbar = page.locator(`revogr-scroll-virtual.${axis}`);
    const vertical = axis === 'vertical';
    const size = () =>
      scrollbar.evaluate((el, vertical) => {
        const rect = el.getBoundingClientRect();
        return vertical ? rect.width : rect.height;
      }, vertical);
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

    // The timed visible state must not collapse a scrollbar still under the pointer.
    await scrollbar.evaluate(
      (el, vertical) =>
        el.setScroll({
          dimension: vertical ? 'rgRow' : 'rgCol',
          coordinate: 100,
        }),
      vertical,
    );
    await expect(scrollbar).toHaveAttribute('visible', 'true');
    await expect
      .poll(() =>
        scrollbar.evaluate(
          (el, vertical) => (vertical ? el.scrollTop : el.scrollLeft),
          vertical,
        ),
      )
      .toBeGreaterThan(0);
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
