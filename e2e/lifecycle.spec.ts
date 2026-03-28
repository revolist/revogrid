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
