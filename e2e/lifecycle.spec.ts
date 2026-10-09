import { expect } from '@playwright/test';
import { test, type E2EPage } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  mainDataRows,
  scrollToCell,
} from './helpers';

const columns = buildColumns([
  { prop: 'id', name: 'ID' },
  { prop: 'name', name: 'Name' },
  { prop: 'role', name: 'Role' },
]);

const source = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  name: `Name ${index + 1}`,
  role: `Role ${index + 1}`,
}));

async function createGrid(page: E2EPage) {
  await page.setContent('<div id="grid-host" style="width:900px; height:320px;"></div>');

  await page.evaluate(({ nextColumns, nextSource }) => {
    const host = document.querySelector<HTMLDivElement>('#grid-host');
    if (!host) {
      throw new Error('Grid host was not found');
    }

    const grid = document.createElement('revo-grid') as HTMLRevoGridElement & {
      __e2eMarker?: string;
    };
    grid.style.display = 'block';
    grid.style.width = '100%';
    grid.style.height = '100%';
    grid.columns = nextColumns;
    grid.source = nextSource;
    grid.rowSize = 30;
    grid.__e2eMarker = 'persistent-grid';

    host.append(grid);
    (globalThis as typeof globalThis & { __revoGridE2EInstance?: HTMLRevoGridElement }).__revoGridE2EInstance = grid;
  }, { nextColumns: columns, nextSource: source });

  await page.waitForChanges();
  await expect(page.locator(SELECTORS.grid)).toBeVisible();
}

async function disconnectGrid(page: E2EPage) {
  await page.evaluate(() => {
    const globals = globalThis as typeof globalThis & { __revoGridE2EInstance?: HTMLRevoGridElement };
    globals.__revoGridE2EInstance?.remove();
  });
  await page.waitForChanges();
  await expect(page.locator(SELECTORS.grid)).toHaveCount(0);
}

async function reconnectSameGrid(page: E2EPage) {
  await page.evaluate(() => {
    const host = document.querySelector<HTMLDivElement>('#grid-host');
    const globals = globalThis as typeof globalThis & { __revoGridE2EInstance?: HTMLRevoGridElement };
    if (!host) {
      throw new Error('Grid host was not found');
    }
    if (!globals.__revoGridE2EInstance) {
      throw new Error('Stored grid instance was not found');
    }
    host.append(globals.__revoGridE2EInstance);
  });
  await page.waitForChanges();
  await expect(page.locator(SELECTORS.grid)).toBeVisible();
}

async function expectSameGridInstance(page: E2EPage) {
  const marker = await page.evaluate(() => {
    const grid = document.querySelector('revo-grid') as (HTMLRevoGridElement & { __e2eMarker?: string }) | null;
    return grid?.__e2eMarker ?? null;
  });
  expect(marker).toBe('persistent-grid');
}

test.describe('lifecycle', () => {
  test('updates viewport width and height after repeated DOM moves', async ({ page }) => {
    await page.setContent('<div id="moved" style="width:400px;height:200px"></div><div id="control" style="width:400px;height:200px"></div>');
    await page.evaluate(() => {
      for (const id of ['moved', 'control']) {
        const grid = document.createElement('revo-grid');
        grid.style.cssText = 'display:block;width:100%;height:100%';
        grid.rowSize = 30;
        grid.columns = Array.from({ length: 20 }, (_, i) => ({ prop: `c${i}`, name: `c${i}`, size: 80 }));
        grid.source = Array.from({ length: 60 }, (_, row) => Object.fromEntries(
          Array.from({ length: 20 }, (_, col) => [`c${col}`, `${row}:${col}`]),
        ));
        document.getElementById(id)!.appendChild(grid);
      }
    });
    await page.waitForChanges();
    const visible = (id: string) => page.locator(`#${id} revo-grid`).evaluate(grid => ({
      headers: [...grid.querySelectorAll('revogr-header .rgHeaderCell')].map(el => el.textContent),
      rows: grid.querySelectorAll('revogr-data[type="rgRow"] .rgRow').length,
    }));
    await expect.poll(() => visible('moved')).toEqual(await visible('control'));
    const original = await page.locator('#moved revo-grid').elementHandle();

    for (const size of [{ width: 1000, height: 420 }, { width: 320, height: 150 }]) {
      const before = await visible('control');
      await page.evaluate(({ width, height }) => {
        const host = document.getElementById('moved')!;
        const replacement = host.cloneNode(false) as HTMLElement;
        host.replaceWith(replacement);
        replacement.appendChild(host.firstElementChild!);
        for (const id of ['moved', 'control']) {
          const container = document.getElementById(id)!;
          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
        }
      }, size);
      await page.waitForChanges();
      await expect.poll(() => visible('control')).not.toEqual(before);
      await expect.poll(() => visible('moved')).toEqual(await visible('control'));
      expect(await original!.evaluate(grid => grid === document.querySelector('#moved revo-grid'))).toBe(true);
    }
  });

  test('keeps the same grid instance stable across disconnect and reconnect', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await createGrid(page);
    await expectSameGridInstance(page);
    await expect(mainDataRows(page)).not.toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('Name 1');

    await scrollToCell(page, 0, 30 * 10);
    await expect(dataCell(page, 10, 1)).toHaveText('Name 11');

    await disconnectGrid(page);
    await reconnectSameGrid(page);

    await expectSameGridInstance(page);
    await expect(dataCell(page, 10, 1)).toHaveText('Name 11');

    await disconnectGrid(page);
    await reconnectSameGrid(page);

    await expectSameGridInstance(page);
    await expect(mainDataRows(page)).not.toHaveCount(0);
    await expect(dataCell(page, 10, 2)).toHaveText('Role 11');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
