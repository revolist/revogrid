import { test } from '@stencil/playwright';
import {
  buildColumns,
  expectFocusedCell,
  mountGrid,
  setCellsFocus,
  type SampleRow,
} from './helpers';

test.describe('navigation', () => {
  test('moves focus with arrow keys and tab navigation', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      range: true,
    });

    await setCellsFocus(page, { x: 0, y: 0 });
    await expectFocusedCell(page, { x: 0, y: 0 });

    await page.keyboard.press('ArrowRight');
    await expectFocusedCell(page, { x: 1, y: 0 });

    await page.keyboard.press('ArrowDown');
    await expectFocusedCell(page, { x: 1, y: 1 });

    await page.keyboard.press('Tab');
    await expectFocusedCell(page, { x: 2, y: 1 });

    await page.keyboard.press('Shift+Tab');
    await expectFocusedCell(page, { x: 1, y: 1 });
  });
});
