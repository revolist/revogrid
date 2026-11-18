import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  buildColumns,
  dataCell,
  mountGrid,
  rowHeaderCell,
  SELECTORS,
} from './helpers';

test.describe('accessibility', () => {
  test('owns leaf and grouped column headers in their respective rows', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [
        {
          name: 'People',
          children: [
            {
              name: 'Identity',
              children: [
                { prop: 'id', name: 'ID', pin: 'colPinStart' },
                { prop: 'name', name: 'Name' },
              ],
            },
          ],
        },
      ],
      source: [{ id: 1, name: 'Alice' }],
      rowHeaders: true,
    });

    const headerRows = page.locator('[role="row"][aria-owns]');
    await expect(headerRows).toHaveCount(3);
    for (const [index, names] of [
      ['1', ['People', 'People']],
      ['2', ['Identity', 'Identity']],
      ['3', ['ID', 'Name']],
    ] as const) {
      const owner = headerRows.and(page.locator(`[aria-rowindex="${index}"]`));
      await expect
        .poll(() =>
          owner.evaluate(row =>
            row
              .getAttribute('aria-owns')!
              .split(' ')
              .map(id =>
                row.ownerDocument.getElementById(id)?.textContent?.trim(),
              ),
          ),
        )
        .toEqual(names);
    }
    await expect(page.locator('revogr-header [role="row"]')).toHaveCount(0);
    await expect(page.getByRole('treegrid')).toHaveAttribute(
      'aria-rowcount',
      '4',
    );
    await expect(dataCell(page, 0, 0)).toHaveAttribute('aria-rowindex', '4');

    const session = await page.context().newCDPSession(page);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    await session.detach();
    const byId = new Map(nodes.map(node => [node.nodeId, node]));
    const ownedHeaderRows = nodes
      .filter(node => !node.ignored && node.role?.value === 'row')
      .map(row => (row.childIds ?? []).map(id => byId.get(id)))
      .filter(children =>
        children.some(child => child?.role?.value === 'columnheader'),
      );
    expect(
      ownedHeaderRows.map(children =>
        children.map(child => String(child?.name?.value).toLowerCase()),
      ),
    ).toEqual([
      ['people', 'people'],
      ['identity', 'identity'],
      ['id', 'name'],
    ]);

    await page.evaluate(() => {
      const ids = Array.from(
        document.querySelectorAll('[id^="revo-a11y-header-"]'),
        header => Number(header.id.split('-').at(-1)),
      );
      const collision = document.createElement('div');
      collision.id = `revo-a11y-header-${Math.max(...ids) + 1}`;
      document.body.append(collision);
      document.querySelector('revo-grid')!.columns = [
        { prop: 'replacement', name: 'Name' },
      ];
    });
    await expect(headerRows).toHaveCount(1);
    await expect(headerRows).toHaveAttribute('aria-rowindex', '1');
    const name = page.getByRole('columnheader', { name: 'Name' });
    await expect
      .poll(() => name.getAttribute('id'))
      .toMatch(/^revo-a11y-header-/);
    await expect(headerRows).toHaveAttribute(
      'aria-owns',
      (await name.getAttribute('id'))!,
    );
    await expect
      .poll(() =>
        name.evaluate(
          header =>
            header.ownerDocument.querySelectorAll(`#${CSS.escape(header.id)}`)
              .length,
        ),
      )
      .toBe(1);
  });

  test('uses current row indices after the grid reconnects', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
    });
    const cell = dataCell(page, 0, 0);
    await expect(cell).toHaveAttribute('aria-rowindex', '2');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.remove();
      document.body.firstElementChild!.append(grid);
    });
    await expect(page.locator('revogr-data .rgRow').first()).toHaveAttribute(
      'aria-rowindex',
      '2',
    );
    await expect(cell).toHaveAttribute('aria-rowindex', '2');
    await expect(page.locator('[role="row"][aria-owns]')).toHaveCount(1);
  });

  test('rechecks generated header IDs after moving to a new DOM root', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
    });
    const header = page.getByRole('columnheader', { name: 'Name' });
    await expect
      .poll(() => header.getAttribute('id'))
      .toMatch(/^revo-a11y-header-/);
    const originalHeader = await header.evaluateHandle(element => element);
    const previousId = (await header.getAttribute('id'))!;
    await page.evaluate(id => {
      const grid = document.querySelector('revo-grid')!;
      const collision = document.createElement('div');
      collision.id = id;
      grid.before(collision);
      grid.additionalData = { refreshHeaders: true };
    }, previousId);
    await expect(header).not.toHaveAttribute('id', previousId);
    const updatedId = (await header.getAttribute('id'))!;
    await page.evaluate(id => {
      const grid = document.querySelector('revo-grid')!;
      const host = document.createElement('div');
      document.body.append(host);
      const root = host.attachShadow({ mode: 'open' });
      const collision = document.createElement('div');
      collision.id = id;
      root.append(collision);
      document
        .querySelectorAll('style')
        .forEach(style => root.append(style.cloneNode(true)));
      root.append(grid);
    }, updatedId);
    await expect(header).not.toHaveAttribute('id', updatedId);
    expect(
      await header.evaluate(
        (element, original) => element === original,
        originalHeader,
      ),
    ).toBe(true);
    await originalHeader.dispose();
    await expect(page.locator('[role="row"][aria-owns]')).toHaveAttribute(
      'aria-owns',
      (await header.getAttribute('id'))!,
    );
  });

  test('updates header ownership as columns enter and leave the viewport', async ({
    page,
  }) => {
    await mountGrid(page, {
      width: 480,
      columns: Array.from({ length: 50 }, (_, index) => ({
        prop: `field-${index}`,
        name: `Field ${index}`,
      })),
      source: [{}],
    });
    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.addEventListener('beforeheaderrender', event => {
        const { detail } = event as CustomEvent<
          HTMLRevogrHeaderElementEventMap['beforeheaderrender']
        >;
        detail.data.columnProperties = () => ({
          role: 'columnheader cell',
          class: { rgHeaderCell: false },
        });
      });
      void grid.scrollToColumnIndex(49);
    });
    const owner = page.locator('[role="row"][aria-owns]');
    const lastHeader = page.getByRole('columnheader', { name: 'Field 49' });
    await expect(lastHeader).toHaveAttribute('role', 'columnheader cell');
    await expect(lastHeader).not.toHaveClass(/rgHeaderCell/);
    await expect
      .poll(() =>
        owner.evaluate(row =>
          row
            .getAttribute('aria-owns')!
            .split(' ')
            .map(id =>
              row.ownerDocument.getElementById(id)?.textContent?.trim(),
            ),
        ),
      )
      .toContain('Field 49');
    await expect(
      page.getByRole('columnheader', { name: 'Field 0', exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        owner.evaluate(row =>
          row
            .getAttribute('aria-owns')!
            .split(' ')
            .every(id => !!row.ownerDocument.getElementById(id)),
        ),
      )
      .toBe(true);
  });

  test('owns group headers supplied by the render hook', async ({ page }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
    });
    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.addEventListener('beforecolumnapplied', ({ detail }) => {
        for (const group of detail.columnGrouping.rgCol) {
          group.indexes = [];
        }
      });
      grid.addEventListener('beforegroupheaderrender', event => {
        const { detail } = event as CustomEvent<
          HTMLRevogrHeaderElementEventMap['beforegroupheaderrender']
        >;
        detail.group = { ...detail.group, indexes: [0] };
      });
      grid.columns = [
        { name: 'People', children: [{ prop: 'name', name: 'Name' }] },
      ];
    });
    const treegrid = page.getByRole('treegrid');
    await expect(treegrid).toHaveAttribute('aria-rowcount', '3');
    const group = page.getByRole('columnheader', { name: 'People' });
    await expect(group).toBeVisible();
    await expect
      .poll(() => group.getAttribute('id'))
      .toMatch(/^revo-a11y-header-/);
    await expect(
      treegrid.locator('[role="row"][aria-rowindex="1"]'),
    ).toHaveAttribute('aria-owns', (await group.getAttribute('id'))!);
  });

  test('leaves nested grids in charge of their own row indices', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ name: 'People', children: [{ prop: 'name', name: 'Name' }] }],
      source: [{ name: 'Alice' }],
    });
    await page.evaluate(() => {
      const nested = document.createElement('revo-grid');
      nested.slot = 'footer';
      nested.style.height = '300px';
      nested.columns = [{ prop: 'name', name: 'Name' }];
      nested.source = [{ name: 'Ben' }];
      document.querySelector('revo-grid')!.append(nested);
    });
    const nested = page.locator('revo-grid revo-grid');
    await expect(nested.getByRole('treegrid')).toHaveAttribute(
      'aria-rowcount',
      '2',
    );
    const nestedCell = nested.getByRole('gridcell', { name: 'Ben' });
    await expect(nestedCell).toHaveAttribute('aria-rowindex', '2');
    await expect(nested.locator('revogr-data [role="row"]')).toHaveAttribute(
      'aria-rowindex',
      '2',
    );
  });

  test('exposes row-number cells as row headers and preserves custom properties', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
      rowHeaders: { size: 60, __cellTestIds: true },
    });

    const cell = rowHeaderCell(page, 0);
    await expect(cell).toHaveAttribute('role', 'rowheader');
    await expect(cell).toHaveAttribute('data-testid', 'row-header-0');
    await expect(
      page
        .locator(SELECTORS.rowHeaderViewport)
        .getByRole('row')
        .getByRole('rowheader', { name: '1', exact: true }),
    ).toBeVisible();
  });

  test('keeps attribution outside the treegrid and reveals it on keyboard focus', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: [{ name: 'Alice' }],
    });

    const grid = page.locator(SELECTORS.grid);
    const treegrid = grid.getByRole('treegrid');
    const attribution = grid.getByRole('link', { name: 'RevoGrid' });
    await expect(treegrid.getByRole('link', { name: 'RevoGrid' })).toHaveCount(
      0,
    );
    await expect(attribution).toHaveAttribute(
      'href',
      'https://rv-grid.com/guide/attribution',
    );
    await expect(attribution).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(attribution).toBeFocused();
    await expect(attribution).toHaveCSS('opacity', '1');
    await attribution.evaluate(link => {
      link.addEventListener(
        'click',
        event => {
          event.preventDefault();
          link.dataset.activated = String(event.isTrusted);
        },
        { once: true },
      );
    });
    await page.keyboard.press('Enter');
    await expect(attribution).toHaveAttribute('data-activated', 'true');
    await page.keyboard.press('Tab');
    await expect(treegrid).toBeFocused();

    await grid.evaluate(element =>
      element.setAttribute('aria-label', 'People'),
    );
    await expect(treegrid).toHaveAccessibleName('People');

    await grid.evaluate(element => {
      const label = document.createElement('span');
      label.id = 'grid-label';
      label.textContent = 'Team roster';
      element.before(label);
      element.setAttribute('aria-labelledby', label.id);
    });
    await expect(treegrid).toHaveAccessibleName('Team roster');
    await expect(treegrid).toHaveAttribute('aria-colcount', '1');
  });

  test('tabs to overflowing vertical panes and scrolls with the keyboard', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: [{ prop: 'name', name: 'Name' }],
      source: Array.from({ length: 200 }, (_, index) => ({
        name: `Person ${index}`,
      })),
      rowHeaders: true,
    });

    const grid = page.locator(SELECTORS.grid);
    const rowHeaderPane = page
      .locator(SELECTORS.rowHeaderViewport)
      .locator('.vertical-inner');
    const dataPane = page
      .locator(SELECTORS.mainViewport)
      .locator('.vertical-inner');
    await expect(rowHeaderPane).toHaveAttribute('tabindex', '0');
    await expect(dataPane).toHaveAttribute('tabindex', '0');
    await grid.getByRole('treegrid').focus();
    await page.keyboard.press('Tab');
    await expect(rowHeaderPane).toBeFocused();
    const rowHeaderStart = await rowHeaderPane.evaluate(el => {
      el.addEventListener(
        'scrollend',
        () => {
          el.setAttribute('data-scroll-ended', 'true');
        },
        { once: true },
      );
      return el.scrollTop;
    });
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => rowHeaderPane.evaluate(el => el.scrollTop))
      .toBeGreaterThan(rowHeaderStart);
    await expect(rowHeaderPane).toHaveAttribute('data-scroll-ended', 'true');
    const synchronizedTop = await rowHeaderPane.evaluate(el => el.scrollTop);
    await expect
      .poll(() => dataPane.evaluate(el => el.scrollTop))
      .toBe(synchronizedTop);
    await page.keyboard.press('Tab');
    await expect(dataPane).toBeFocused();
    const dataStart = await dataPane.evaluate(el => el.scrollTop);
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => dataPane.evaluate(el => el.scrollTop))
      .toBeGreaterThan(dataStart);

    await page.evaluate(() => {
      document.querySelector('revo-grid')!.source = [{ name: 'Alice' }];
    });
    await expect(dataPane).not.toHaveAttribute('tabindex');
    await expect(rowHeaderPane).not.toHaveAttribute('tabindex');
  });

  test('omits accessibility roles and pane tab stops when accessibility is disabled', async ({
    page,
  }) => {
    await mountGrid(page, {
      accessible: false,
      columns: [
        {
          name: 'People',
          children: [{ prop: 'name', name: 'Name' }],
        },
      ],
      source: Array.from({ length: 200 }, () => ({ name: 'Alice' })),
      rowHeaders: true,
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).not.toHaveAttribute('role');
    await expect(grid.locator('[role]')).toHaveCount(0);
    await expect(grid.locator('.vertical-inner[tabindex]')).toHaveCount(0);
  });

  test('updates pinned row and cell ARIA indices when section lengths change', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      pinnedTopSource: [{ name: 'top' }],
      source: [{ name: 'main' }],
      pinnedBottomSource: [{ name: 'bottom' }],
    });
    const mainRows = page.locator('revogr-data[type="rgRow"] [role="row"]');
    const bottomRows = page.locator(
      'revogr-data[type="rowPinEnd"] [role="row"]',
    );
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '3');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '4');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.pinnedTopSource = [{ name: 'top' }, { name: 'new top' }];
    });
    await expect(mainRows.first()).toHaveAttribute('aria-rowindex', '4');
    await expect(
      mainRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '4');
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '5');

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid')!;
      grid.source = [{ name: 'main' }, { name: 'new main' }];
    });
    await expect(bottomRows.first()).toHaveAttribute('aria-rowindex', '6');
    await expect(
      bottomRows.first().locator('[role="gridcell"]').first(),
    ).toHaveAttribute('aria-rowindex', '6');
    await expect(page.getByRole('treegrid')).toHaveAttribute(
      'aria-rowcount',
      '6',
    );
  });

  test('uses one-based ARIA indices for data cells', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'id', name: 'ID' },
        { prop: 'name', name: 'Name' },
      ]),
      source: [{ id: 101, name: 'Alice' }],
    });

    const firstCell = dataCell(page, 0, 0);

    await expect(firstCell).toHaveAttribute('role', 'gridcell');
    await expect(firstCell).toHaveAttribute('aria-colindex', '1');
    await expect(firstCell).toHaveAttribute('aria-rowindex', '2');
  });
});
