import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  expectVisibleColumnValues,
  mainDataRows,
  mountGrid,
  visibleColumnValues,
  withHeaderTestId,
} from './helpers';

test.describe('row grouping', () => {
  test('renders grouped rows and toggles expansion', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
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
      grouping: {
        props: ['team'],
        expandedAll: true,
        prevExpanded: {
          North: true,
          South: true,
        },
      },
      rowHeaders: true,
    });

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    const northGroupToggle = mainGroupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton);

    await expect(mainGroupRows).toContainText(['North', 'South']);
    await expect(mainGroupRows).toHaveCount(2);
    await expect(mainGroupRows.filter({ hasText: 'North' })).toHaveAttribute('expanded', /^(|true)$/);
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    await northGroupToggle.click();
    await expect(mainGroupRows.filter({ hasText: 'North' })).not.toHaveAttribute('expanded', /^(|true)$/);
    await expectVisibleColumnValues(page, 1, ['Cara', 'Dan']);

    await northGroupToggle.click();
    await expect(mainGroupRows.filter({ hasText: 'North' })).toHaveAttribute('expanded', /^(|true)$/);
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);
  });

  test('renders boolean false distinctly from an empty group value', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([{ prop: 'name', name: 'Name' }]),
      source: [
        { name: 'Boolean group', group: false },
        { name: 'Empty group', group: null },
      ],
      grouping: {
        props: ['group'],
        expandedAll: true,
        emptyGroupValue: '(empty)',
      },
    });

    const mainGroupRows = page.locator(
      `${SELECTORS.mainViewport} .groupingRow`,
    );
    await expect(mainGroupRows).toHaveCount(2);
    expect(
      (await mainGroupRows.allTextContents()).map(label => label.trim()),
    ).toEqual(['false', '(empty)']);
  });

  test('keeps the legacy full-row group label template unchanged', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'name', name: 'Name' },
        { prop: 'role', name: 'Role' },
      ]),
      source: [
        { name: 'Alice', role: 'Engineer', team: 'North' },
        { name: 'Ben', role: 'Designer', team: 'South' },
      ],
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = {
        props: ['team'],
        expandedAll: true,
        groupLabelTemplate(createElement: any, { name }: any) {
          return createElement(
            'span',
            { 'data-testid': 'legacy-group-label' },
            `legacy:${name}`,
          );
        },
      };
    });
    await page.waitForChanges();

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expect(mainGroupRows.getByTestId('legacy-group-label')).toHaveCount(2);
    await expect(mainGroupRows.getByTestId('legacy-group-label')).toContainText([
      'legacy:North',
      'legacy:South',
    ]);
    await expect(mainGroupRows.locator('.groupingCell')).toHaveCount(0);
  });

  test('renders the configured value for missing nested group keys', async ({ page }) => {
    await mountGrid(page, {
      columns: buildColumns([
        { prop: 'a', name: 'A' },
        { prop: 'b', name: 'B' },
      ]),
      source: [
        { a: '1', b: '1', key: 'b' },
        { a: '2', b: '2', key: 'b', key2: 'c' },
        { a: '3', b: '3', key: 'b', key2: 'd' },
        { a: '4', b: '4', key: 'a', key2: 'c' },
      ],
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      const props = ['key', 'key2'];
      grid.grouping = {
        props,
        expandedAll: true,
        emptyGroupValue: '(empty)',
        groupLabelTemplate(createElement: any, { name, depth }: any) {
          return createElement(
            'span',
            { 'data-testid': 'nullish-group-label' },
            `${props[depth]}: ${name}`,
          );
        },
      };
    });
    await page.waitForChanges();

    const labels = page.locator(
      `${SELECTORS.mainViewport} [data-testid="nullish-group-label"]`,
    );
    await expect(labels).toHaveCount(6);
    await expect(labels).toContainText([
      'key: b',
      'key2: (empty)',
      'key2: c',
      'key2: d',
      'key: a',
      'key2: c',
    ]);
    expect(
      (await labels.allTextContents()).some(label => label.includes('null')),
    ).toBe(false);
  });

  test('renders custom group cells from the horizontal virtual viewport', async ({ page }) => {
    const metricColumns = Array.from({ length: 40 }, (_, index) => ({
      prop: `metric${index}`,
      name: `Metric ${index}`,
      size: 100,
    }));
    const metricValues = Object.fromEntries(
      metricColumns.map(({ prop }, index) => [prop, index]),
    );

    await mountGrid(page, {
      width: 340,
      columns: buildColumns([
        { prop: 'name', name: 'Group', size: 100 },
        ...metricColumns,
      ]),
      source: [
        { name: 'Alice', team: 'North', ...metricValues },
        { name: 'Ben', team: 'North', ...metricValues },
        { name: 'Cara', team: 'South', ...metricValues },
        { name: 'Dan', team: 'South', ...metricValues },
      ],
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = {
        props: ['team'],
        expandedAll: true,
        groupLabelTemplate(createElement: any) {
          return createElement(
            'span',
            { 'data-testid': 'unused-legacy-group-label' },
            'legacy',
          );
        },
        groupCellTemplate(createElement: any, props: any) {
          const content = props.group.isLabelColumn
            ? `group:${props.group.name}`
            : `${String(props.column.prop)}:${String(props.value ?? '')}`;
          if (props.group.isLabelColumn) {
            return createElement(
              'button',
              {
                'data-testid': `virtual-group-toggle-${props.group.name}`,
                onClick: props.group.onExpand,
              },
              content,
            );
          }
          return createElement(
            'span',
            {
              'data-testid': 'virtual-group-value',
              'data-prop': String(props.column.prop),
            },
            content,
          );
        },
      };
    });
    await page.waitForChanges();

    await page.evaluate(async () => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      const store = await grid.getSourceStore();
      const groupedSource = store.get('source').map((row: Record<string, any>) => {
        const groupName = row['__rvgr-name'];
        if (typeof groupName === 'undefined') {
          return row;
        }
        const groupRow = { ...row };
        for (let index = 0; index < 40; index++) {
          groupRow[`metric${index}`] = `${groupName}-${index}`;
        }
        return groupRow;
      });
      store.set('source', groupedSource);
    });
    await page.waitForChanges();

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    const groupCells = mainGroupRows.locator('.groupingCell');

    await expect(mainGroupRows.getByTestId('unused-legacy-group-label')).toHaveCount(0);
    await expect(mainGroupRows.getByTestId('virtual-group-toggle-North')).toHaveCount(1);
    await expect(
      mainGroupRows
        .filter({ hasText: 'group:North' })
        .locator('[data-testid="virtual-group-value"][data-prop="metric0"]'),
    ).toContainText('metric0:North-0');
    expect(await groupCells.count()).toBeLessThan(20);

    await mainGroupRows.getByTestId('virtual-group-toggle-North').click();
    await expect(
      page.locator(`${SELECTORS.mainViewport} ${SELECTORS.renderedRows}:not(.groupingRow)`),
    ).toHaveCount(2);

    const initialColumnIndexes = await groupCells.evaluateAll(cells =>
      [...new Set(cells.map(cell => Number(cell.getAttribute('data-rgCol'))))],
    );
    expect(initialColumnIndexes).toContain(0);

    await page.evaluate(async () => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      await grid.scrollToColumnIndex(25);
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        groupCells
          .evaluateAll(cells =>
            [...new Set(cells.map(cell => Number(cell.getAttribute('data-rgCol'))))],
          )
          .then(indexes => indexes.length > 0 && indexes.every(index => index > 10)),
      )
      .toBe(true);
    expect(await groupCells.count()).toBeLessThan(20);
  });

  test('filters collapsed grouped rows and keeps only matching branches visible', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('group-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: false,
      },
      rowHeaders: true,
    });

    await expect(mainDataRows(page)).toHaveCount(2);

    await page
      .getByTestId('group-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expect(mainGroupRows).toHaveCount(1);
    await expect(mainGroupRows).toContainText(['South']);
    await expect(mainDataRows(page)).toHaveCount(1);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = {
        ...(grid.grouping as Record<string, unknown>),
        expandedAll: true,
      };
    });

    await expectVisibleColumnValues(page, 1, ['Cara']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('keeps matching groups collapsed when filtered source is replaced', async ({ page }) => {
    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true },
    ]);

    await mountGrid(page, {
      columns,
      source: [
        { id: 1, name: 'Alice', role: 'Engineer', team: 'North' },
        { id: 2, name: 'Cara', role: 'Manager', team: 'South' },
      ],
      filter: {
        multiFilterItems: {
          role: [{ id: 0, type: 'eq', value: 'Manager', relation: 'and' }],
        },
      },
      grouping: {
        props: ['team'],
        expandedAll: false,
      },
      rowHeaders: true,
    });

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expect(mainGroupRows).toHaveCount(1);
    await expect(mainGroupRows).toContainText(['South']);
    await expect(mainDataRows(page)).toHaveCount(1);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 3, name: 'Eve', role: 'Manager', team: 'West' },
        { id: 4, name: 'Finn', role: 'Designer', team: 'West' },
      ];
    });
    await page.waitForChanges();

    await expect(mainGroupRows).toHaveCount(1);
    await expect(mainGroupRows).toContainText(['West']);
    await expect(mainDataRows(page)).toHaveCount(1);

    await mainGroupRows.locator(SELECTORS.groupExpandButton).click();
    await expectVisibleColumnValues(page, 1, ['Eve']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('keeps filter trims mapped when grouping is cleared', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('clear-grouping-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await page
      .getByTestId('clear-grouping-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    await expectVisibleColumnValues(page, 1, ['Cara']);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.grouping = { props: [] };
    });
    await page.waitForChanges();

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toHaveCount(0);
    await expectVisibleColumnValues(page, 1, ['Cara']);
    await expect(mainDataRows(page)).toHaveCount(1);
  });

  test('recalculates filtered group rows against freshly updated source', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('source-update-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await page
      .getByTestId('source-update-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Manager');

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText(['South']);
    await expectVisibleColumnValues(page, 1, ['Cara']);

    await filterPanel.getByRole('button', { name: 'ok' }).click();
    await expect(filterPanel).not.toBeVisible();

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 5, name: 'Eve', role: 'Manager', city: 'Madrid', team: 'West' },
        { id: 6, name: 'Finn', role: 'Designer', city: 'Paris', team: 'East' },
      ];
    });
    await page.waitForChanges();

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText(['West']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).not.toContainText(['South']);
    await expectVisibleColumnValues(page, 1, ['Eve']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('sorts grouped rows and restores source order when sorting is cleared', async ({
    page,
  }) => {
    const source = [
      { id: 1, name: 'Charlie', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Alice', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
      { id: 4, name: 'Ben', role: 'Manager', city: 'Braga', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      {
        prop: 'name',
        name: 'Name',
        sortable: true,
        ...withHeaderTestId('group-sort-name'),
      },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await expectVisibleColumnValues(page, 1, ['Charlie', 'Alice', 'Dan', 'Ben']);

    await page.getByTestId('group-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Charlie', 'Ben', 'Dan']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'North',
      'South',
    ]);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.grouping = {
        ...(grid.grouping as Record<string, unknown>),
      };
    });
    await page.waitForChanges();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Charlie', 'Ben', 'Dan']);

    await page.getByTestId('group-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Dan', 'Ben', 'Charlie', 'Alice']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'South',
      'North',
    ]);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
          if (!grid) throw new Error('Grid was not found');
          const store = await grid.getSourceStore();
          return store
            .get('source')
            .map((row: Record<string, unknown>) => row.name)
            .filter((name): name is string => typeof name === 'string');
        }),
      )
      .toEqual(['Charlie', 'Alice', 'Dan', 'Ben']);

    await page.getByTestId('group-sort-name').click();
    await expectVisibleColumnValues(page, 1, ['Charlie', 'Alice', 'Dan', 'Ben']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'North',
      'South',
    ]);
  });

  test('sorts nested groups and restores their original hierarchy order', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'name',
          name: 'Name',
          sortable: true,
          ...withHeaderTestId('nested-group-sort-name'),
        },
      ]),
      source: [
        { name: 'Zoe', region: 'Europe', team: 'North' },
        { name: 'Mia', region: 'Europe', team: 'North' },
        { name: 'Yuri', region: 'Europe', team: 'South' },
        { name: 'Amy', region: 'Asia', team: 'East' },
        { name: 'Ben', region: 'Asia', team: 'West' },
      ],
      grouping: {
        props: ['region', 'team'],
        expandedAll: true,
      },
    });

    const groupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await expectVisibleColumnValues(page, 0, ['Zoe', 'Mia', 'Yuri', 'Amy', 'Ben']);
    await expect(groupRows).toContainText([
      'Europe',
      'North',
      'South',
      'Asia',
      'East',
      'West',
    ]);

    await groupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton)
      .click();
    await expectVisibleColumnValues(page, 0, ['Yuri', 'Amy', 'Ben']);

    await page.getByTestId('nested-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Amy', 'Ben', 'Yuri']);
    await expect(groupRows).toContainText([
      'Asia',
      'East',
      'West',
      'Europe',
      'North',
      'South',
    ]);

    await groupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton)
      .click();
    await expectVisibleColumnValues(page, 0, ['Amy', 'Ben', 'Mia', 'Zoe', 'Yuri']);

    await page.getByTestId('nested-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Zoe', 'Mia', 'Yuri', 'Ben', 'Amy']);
    await expect(groupRows).toContainText([
      'Europe',
      'North',
      'South',
      'Asia',
      'West',
      'East',
    ]);

    await page.getByTestId('nested-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Zoe', 'Mia', 'Yuri', 'Amy', 'Ben']);
    await expect(groupRows).toContainText([
      'Europe',
      'North',
      'South',
      'Asia',
      'East',
      'West',
    ]);
  });

  test('sorts replacement grouped source and clears to its original grouped order', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns: buildColumns([
        {
          prop: 'name',
          name: 'Name',
          sortable: true,
          ...withHeaderTestId('replacement-group-sort-name'),
        },
      ]),
      source: [
        { name: 'Charlie', team: 'North' },
        { name: 'Alice', team: 'North' },
      ],
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
    });

    await page.getByTestId('replacement-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Alice', 'Charlie']);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.source = [
        { name: 'Zoe', team: 'West' },
        { name: 'Adam', team: 'East' },
        { name: 'Mike', team: 'West' },
      ];
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 0, ['Adam', 'Mike', 'Zoe']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'East',
      'West',
    ]);

    await page.getByTestId('replacement-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Zoe', 'Mike', 'Adam']);

    await page.getByTestId('replacement-group-sort-name').click();
    await expectVisibleColumnValues(page, 0, ['Zoe', 'Mike', 'Adam']);
    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'West',
      'East',
    ]);
  });

  test('does not reopen collapsed groups when sorting', async ({ page }) => {
    const source = [
      { id: 1, name: 'Charlie', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Alice', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
      { id: 4, name: 'Ben', role: 'Manager', city: 'Braga', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      {
        prop: 'name',
        name: 'Name',
        sortable: true,
        ...withHeaderTestId('group-sort-preserve-collapse-name'),
      },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    const mainGroupRows = page.locator(`${SELECTORS.mainViewport} .groupingRow`);
    await mainGroupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton)
      .click();

    await expectVisibleColumnValues(page, 1, ['Dan', 'Ben']);

    await page.getByTestId('group-sort-preserve-collapse-name').click();

    await expect(page.locator(`${SELECTORS.mainViewport} .groupingRow`)).toContainText([
      'North',
      'South',
    ]);
    await expect(mainGroupRows).toHaveCount(2);
    await expectVisibleColumnValues(page, 1, ['Ben', 'Dan']);

    await mainGroupRows
      .filter({ hasText: 'North' })
      .locator(SELECTORS.groupExpandButton)
      .click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Charlie', 'Ben', 'Dan']);
  });

  test('allows row reordering inside a group and blocks dragging across groups', async ({ page }) => {
    const source = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon', team: 'North' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto', team: 'North' },
      { id: 3, name: 'Cara', role: 'Manager', city: 'Braga', team: 'South' },
      { id: 4, name: 'Dan', role: 'Analyst', city: 'Coimbra', team: 'South' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name', rowDrag: true },
      { prop: 'role', name: 'Role' },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      grouping: {
        props: ['team'],
        expandedAll: true,
      },
      rowHeaders: true,
    });

    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    const benDragHandle = mainDataRows(page).nth(2).locator('[data-rgCol="1"] .revo-draggable');
    const aliceRow = mainDataRows(page).nth(1);
    const benHandleBox = await benDragHandle.boundingBox();
    const aliceRowBox = await aliceRow.boundingBox();

    expect(benHandleBox).not.toBeNull();
    expect(aliceRowBox).not.toBeNull();

    await page.mouse.move(
      benHandleBox!.x + benHandleBox!.width / 2,
      benHandleBox!.y + benHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      aliceRowBox!.x + aliceRowBox!.width / 2,
      aliceRowBox!.y - 20,
      { steps: 12 },
    );
    await page.mouse.up();

    await expectVisibleColumnValues(page, 1, ['Ben', 'Alice', 'Cara', 'Dan']);

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid');
      if (!grid) throw new Error('Grid was not found');
      grid.grouping = {
        ...(grid.grouping as Record<string, unknown>),
      };
    });
    await page.waitForChanges();
    await expectVisibleColumnValues(page, 1, ['Ben', 'Alice', 'Cara', 'Dan']);

    const aliceDragHandle = mainDataRows(page).nth(2).locator('[data-rgCol="1"] .revo-draggable');
    const caraRow = mainDataRows(page).nth(4);
    const aliceHandleBox = await aliceDragHandle.boundingBox();
    const caraRowBox = await caraRow.boundingBox();

    expect(aliceHandleBox).not.toBeNull();
    expect(caraRowBox).not.toBeNull();

    await page.mouse.move(
      aliceHandleBox!.x + aliceHandleBox!.width / 2,
      aliceHandleBox!.y + aliceHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      caraRowBox!.x + caraRowBox!.width / 2,
      caraRowBox!.y + caraRowBox!.height + 20,
      { steps: 12 },
    );
    await page.mouse.up();

    await expect
      .poll(() => visibleColumnValues(page, 1))
      .toEqual(['Ben', 'Alice', 'Cara', 'Dan']);
  });
});
