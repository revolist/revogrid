import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { modernThemeDefinitions } from '../src/themeManager/presets';
import {
  SELECTORS,
  buildColumns,
  buildRows,
  callGridMethod,
  dataCell,
  mountGrid,
  setCellEdit,
  setCellsFocus,
  withHeaderTestId,
} from './helpers';

const columns = buildColumns([
  { prop: 'id', name: 'ID', ...withHeaderTestId('theme-header-id') },
  {
    prop: 'name',
    name: 'Name',
    filter: true,
    ...withHeaderTestId('theme-header-name'),
  },
]);

test.describe('custom themes', () => {
  test('keeps the legacy CSS-only dark theme palette', async ({ page }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'dark',
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveAttribute('theme', 'dark');
    await expect(grid).toHaveAttribute('data-rg-theme-base', 'default');
    await expect(grid).toHaveAttribute('data-rg-theme-scheme', 'dark');
    await expect(grid).toHaveCSS('background-color', 'rgb(33, 37, 41)');
    await expect(dataCell(page, 0, 0)).toHaveCSS(
      'color',
      'rgba(255, 255, 255, 0.9)',
    );
    await expect
      .poll(() =>
        grid.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            background: style
              .getPropertyValue('--revo-grid-background')
              .trim(),
            border: style.getPropertyValue('--revo-grid-border').trim(),
            cellBorder: style
              .getPropertyValue('--revo-grid-cell-border')
              .trim(),
            focused: style.getPropertyValue('--revo-grid-focused-bg').trim(),
          };
        }),
      )
      .toEqual({
        background: '#212529',
        border: 'rgba(255, 255, 255, 0.2)',
        cellBorder: '#424242',
        focused: 'rgba(52, 58, 64, 0.5)',
      });
  });

  test('keeps an arbitrary CSS-only theme reflected and inheritable', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'brand-css',
    });
    await page.addStyleTag({
      content: `
        .brand-shell { --revo-grid-text: rgb(12, 34, 56); }
        revo-grid[theme='brand-css'] { --revo-grid-background: rgb(240, 241, 242); }
      `,
    });
    await page.locator(SELECTORS.grid).evaluate(grid => {
      grid.parentElement?.classList.add('brand-shell');
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveAttribute('theme', 'brand-css');
    await expect(grid).toHaveAttribute('data-rg-theme-base', 'default');
    await expect(grid).toHaveAttribute('data-rg-theme-scheme', 'light');
    await expect
      .poll(() =>
        grid.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            background: style.getPropertyValue('--rg-theme-background').trim(),
            text: style.getPropertyValue('--rg-theme-text').trim(),
          };
        }),
      )
      .toEqual({
        background: 'rgb(240, 241, 242)',
        text: 'rgb(12, 34, 56)',
      });
  });

  test('keeps default column and row header background tokens distinct', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      rowHeaders: true,
      theme: 'split-headers',
      themeDefinitions: [
        {
          name: 'split-headers',
          extends: 'default',
          tokens: {
            headerBg: 'rgb(10, 20, 30)',
            rowHeadersBg: 'rgb(40, 50, 60)',
          },
        },
      ],
    });

    await expect(
      page.locator(`${SELECTORS.mainViewport} revogr-header`),
    ).toHaveCSS('background-color', 'rgb(10, 20, 30)');
    await expect(page.locator(`${SELECTORS.grid} .rowHeaders`)).toHaveCSS(
      'background-color',
      'rgb(40, 50, 60)',
    );
  });

  test('applies typed structure, density, and interaction state tokens', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Linus' },
      ],
      filter: true,
      range: true,
      rtl: true,
      rowHeaders: { __cellTestIds: true },
      theme: 'midnightBrand',
      themeDefinitions: [
        {
          name: 'midnightBrand',
          extends: 'darkMaterial',
          defaultRowSize: 36,
          tokens: {
            background: 'rgb(10, 20, 30)',
            text: 'rgb(220, 221, 222)',
            headerBg: 'rgb(30, 40, 50)',
            headerFontSize: '17px',
            headerTextTransform: 'uppercase',
            rowHeadersColor: 'rgb(210, 120, 30)',
            selectionBorder: 'rgb(1, 2, 3)',
            selectionBg: 'rgba(1, 2, 3, 0.25)',
            filterPanelBg: 'rgb(40, 50, 60)',
            filterPanelText: 'rgb(230, 231, 232)',
          },
        },
      ],
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveAttribute('data-rg-theme-base', 'material');
    await expect(grid).toHaveAttribute('data-rg-theme-scheme', 'dark');
    await expect(grid).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('theme-header-id')).toHaveCSS(
      'font-size',
      '17px',
    );
    await expect(page.getByTestId('theme-header-id')).toHaveCSS(
      'text-transform',
      'uppercase',
    );
    await expect(page.getByTestId('row-header-0')).toHaveCSS(
      'color',
      'rgb(210, 120, 30)',
    );
    await expect(dataCell(page, 0, 0)).toHaveCSS('color', 'rgb(220, 221, 222)');

    const headerBox = await page.getByTestId('theme-header-id').boundingBox();
    const cellBox = await dataCell(page, 0, 0).boundingBox();
    expect(headerBox?.height).toBe(50);
    expect(cellBox?.height).toBe(36);

    await setCellsFocus(page, { x: 0, y: 0 }, { x: 1, y: 1 });
    await expect
      .poll(() =>
        page
          .locator(SELECTORS.focusedCell)
          .evaluate(element => getComputedStyle(element).boxShadow),
      )
      .toContain('rgb(1, 2, 3)');
    await expect
      .poll(() =>
        page
          .locator(SELECTORS.selectedRange)
          .evaluate(element => getComputedStyle(element).backgroundColor),
      )
      .toBe('rgba(1, 2, 3, 0.25)');

    await setCellEdit(page, 0, 'name');
    await expect(page.locator(SELECTORS.editInput)).toHaveCSS(
      'background-color',
      'rgb(10, 20, 30)',
    );
    await page.keyboard.press('Escape');

    await page
      .getByTestId('theme-header-name')
      .locator(SELECTORS.filterButton)
      .click();
    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toHaveCSS('background-color', 'rgb(40, 50, 60)');
    await expect(filterPanel).toHaveCSS('color', 'rgb(230, 231, 232)');
  });

  test('inherits a registered custom theme independent of definition order', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'childTheme',
      themeDefinitions: [
        {
          name: 'childTheme',
          extends: 'parentTheme',
          tokens: {
            text: 'rgb(240, 241, 242)',
            selectionBorder: 'rgb(255, 191, 0)',
          },
        },
        {
          name: 'parentTheme',
          extends: 'darkCompact',
          defaultRowSize: 35,
          tokens: {
            background: 'rgb(10, 20, 30)',
            headerBg: 'rgb(30, 40, 50)',
          },
        },
      ],
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveAttribute('data-rg-theme-base', 'compact');
    await expect(grid).toHaveAttribute('data-rg-theme-scheme', 'dark');
    expect((await dataCell(page, 0, 0).boundingBox())?.height).toBe(35);
    await expect(page.locator('revogr-header').first()).toHaveCSS(
      'background-color',
      'rgb(30, 40, 50)',
    );
    await expect
      .poll(() =>
        grid.evaluate(element => {
          const style = getComputedStyle(element);
          return [
            style.getPropertyValue('--rg-theme-background').trim(),
            style.getPropertyValue('--rg-theme-text').trim(),
            style.getPropertyValue('--rg-theme-selection-border').trim(),
          ];
        }),
      )
      .toEqual(['rgb(10, 20, 30)', 'rgb(240, 241, 242)', 'rgb(255, 191, 0)']);
  });

  test('switches at runtime, clears stale tokens, and preserves custom rows', async ({
    page,
  }) => {
    const rowCount = 120;
    await mountGrid(page, {
      columns,
      source: buildRows(rowCount, ['id', 'name']),
      height: 280,
      theme: 'brand',
      themeDefinitions: [
        {
          name: 'brand',
          extends: 'material',
          defaultRowSize: 31,
          tokens: { background: 'rgb(101, 102, 103)' },
        },
      ],
      rowDefinitions: [{ type: 'rgRow', index: 90, size: 61 }],
    });

    await page.evaluate(() => {
      const grid = document.querySelector<HTMLRevoGridElement>('revo-grid')!;
      const state = { events: [] as string[], rowDefinitionEvents: 0 };
      grid.addEventListener('afterthemechanged', event => {
        state.events.push(event.detail);
      });
      grid.addEventListener('beforerowdefinition', () => {
        state.rowDefinitionEvents += 1;
      });
      (globalThis as any).__themeState = state;
    });

    await page.locator(SELECTORS.grid).evaluate(grid => {
      grid.theme = 'compact';
    });
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.grid)).toHaveAttribute(
      'theme',
      'compact',
    );
    expect((await dataCell(page, 0, 0).boundingBox())?.height).toBe(32);
    expect(
      await page
        .locator(SELECTORS.grid)
        .evaluate(grid =>
          grid.style.getPropertyValue('--revo-grid-background'),
        ),
    ).toBe('');

    await callGridMethod(page, 'scrollToRow', 90);
    await page.waitForChanges();
    expect((await dataCell(page, 90, 0).boundingBox())?.height).toBe(61);

    await page.locator(SELECTORS.grid).evaluate(grid => {
      grid.theme = 'brand';
    });
    await page.waitForChanges();
    expect((await dataCell(page, 90, 0).boundingBox())?.height).toBe(61);

    const stateBeforeColorChange = await page.evaluate(
      () => (globalThis as any).__themeState,
    );
    await page.locator(SELECTORS.grid).evaluate((grid: HTMLRevoGridElement) => {
      grid.themeDefinitions = [
        {
          name: 'brand',
          extends: 'material',
          defaultRowSize: 31,
          tokens: { background: 'rgb(201, 202, 203)' },
        },
      ];
    });
    await page.waitForChanges();

    const stateAfterColorChange = await page.evaluate(
      () => (globalThis as any).__themeState,
    );
    expect(stateAfterColorChange.events).toEqual(['compact', 'brand', 'brand']);
    expect(stateAfterColorChange.rowDefinitionEvents).toBe(
      stateBeforeColorChange.rowDefinitionEvents,
    );
    await expect
      .poll(() =>
        page
          .locator(SELECTORS.grid)
          .evaluate(grid =>
            getComputedStyle(grid)
              .getPropertyValue('--rg-theme-background')
              .trim(),
          ),
      )
      .toBe('rgb(201, 202, 203)');

    await callGridMethod(page, 'scrollToRow', rowCount - 1);
    await page.waitForChanges();
    await expect(dataCell(page, rowCount - 1, 0)).toBeVisible();
  });

  test('keeps custom definition registries isolated per grid', async ({
    page,
  }) => {
    await page.setContent(`
      <div style="height:180px"><revo-grid id="first"></revo-grid></div>
      <div style="height:180px"><revo-grid id="second"></revo-grid></div>
    `);
    await page.waitForSelector('#first');
    await page.evaluate(() => {
      const setup = (id: string, background: string) => {
        const grid = document.querySelector<HTMLRevoGridElement>(id)!;
        grid.style.cssText = 'display:block;width:100%;height:100%';
        grid.columns = [{ prop: 'id', name: 'ID' }];
        grid.source = [{ id: 1 }];
        grid.themeDefinitions = [
          { name: 'shared-name', tokens: { background } },
        ];
        grid.theme = 'shared-name';
      };
      setup('#first', 'rgb(1, 11, 21)');
      setup('#second', 'rgb(2, 12, 22)');
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        page
          .locator('#first')
          .evaluate(grid =>
            getComputedStyle(grid)
              .getPropertyValue('--rg-theme-background')
              .trim(),
          ),
      )
      .toBe('rgb(1, 11, 21)');
    await expect
      .poll(() =>
        page
          .locator('#second')
          .evaluate(grid =>
            getComputedStyle(grid)
              .getPropertyValue('--rg-theme-background')
              .trim(),
          ),
      )
      .toBe('rgb(2, 12, 22)');
  });
});

test('keeps built-in layout metadata and dimensions compatible', async ({
  page,
}) => {
  await mountGrid(page, {
    columns,
    source: [{ id: 1, name: 'Ada' }],
  });

  const cases = [
    ['default', 'default', 'light', 27, 30],
    ['material', 'material', 'light', 42, 50],
    ['compact', 'compact', 'light', 32, 45],
    ['darkMaterial', 'material', 'dark', 42, 50],
    ['darkCompact', 'compact', 'dark', 32, 45],
  ] as const;

  for (const [theme, base, scheme, rowHeight, headerHeight] of cases) {
    await page.locator(SELECTORS.grid).evaluate((grid, nextTheme) => {
      grid.theme = nextTheme;
    }, theme);
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.grid)).toHaveAttribute('theme', theme);
    await expect(page.locator(SELECTORS.grid)).toHaveAttribute(
      'data-rg-theme-base',
      base,
    );
    await expect(page.locator(SELECTORS.grid)).toHaveAttribute(
      'data-rg-theme-scheme',
      scheme,
    );
    expect((await dataCell(page, 0, 0).boundingBox())?.height).toBe(rowHeight);
    expect(
      (await page.getByTestId('theme-header-id').boundingBox())?.height,
    ).toBe(headerHeight);
  }
});

for (const theme of [
  'compact',
  'darkCompact',
  'material',
  'darkMaterial',
] as const) {
  test(`keeps the built-in ${theme} theme surfaces and colors inherited`, async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      rowHeaders: true,
      theme,
    });

    const grid = page.locator(SELECTORS.grid);
    const header = page.locator('revogr-header').first();
    const rowHeaders = page.locator(`${SELECTORS.grid} .rowHeaders`);
    const rowHeaderCell = rowHeaders.locator('.rgCell').first();
    const transparent = 'rgba(0, 0, 0, 0)';
    const inheritedColor = await grid.evaluate(
      element => getComputedStyle(element).color,
    );

    await expect(grid).toHaveCSS('background-color', transparent);
    await expect(header).toHaveCSS('background-color', transparent);
    await expect(rowHeaders).toHaveCSS('background-color', transparent);
    await expect(header).toHaveCSS('color', inheritedColor);
    await expect(rowHeaders).toHaveCSS('color', inheritedColor);
    await expect(rowHeaderCell).toHaveCSS('color', inheritedColor);
  });
}

test('switches between the modern presets with complete visual metadata', async ({
  page,
}) => {
  await mountGrid(page, {
    columns,
    source: [{ id: 1, name: 'Ada' }],
    theme: 'ocean',
    themeDefinitions: modernThemeDefinitions,
  });

  const grid = page.locator(SELECTORS.grid);
  await setCellsFocus(page, { x: 0, y: 0 }, { x: 1, y: 0 });
  const cases = [
    [
      'ocean',
      'material',
      'light',
      38,
      '#f8fafc',
      'rgb(238, 244, 251)',
      '#2563eb',
      'rgb(37, 99, 235)',
      'rgb(219, 234, 254)',
    ],
    [
      'midnight',
      'material',
      'dark',
      40,
      '#0b1020',
      'rgb(18, 26, 47)',
      '#22d3ee',
      'rgb(34, 211, 238)',
      'rgb(23, 37, 84)',
    ],
    [
      'aurora',
      'compact',
      'dark',
      34,
      '#071714',
      'rgb(12, 36, 32)',
      '#34d399',
      'rgb(52, 211, 153)',
      'rgb(16, 61, 52)',
    ],
    [
      'highContrast',
      'material',
      'light',
      40,
      '#ffffff',
      'rgb(17, 24, 39)',
      '#003eaa',
      'rgb(0, 62, 170)',
      'rgb(0, 62, 170)',
    ],
    [
      'highContrastDark',
      'material',
      'dark',
      40,
      '#050505',
      'rgb(23, 23, 23)',
      '#00e5ff',
      'rgb(0, 229, 255)',
      'rgb(0, 95, 115)',
    ],
  ] as const;

  for (const [
    theme,
    base,
    scheme,
    rowHeight,
    background,
    headerBackground,
    selection,
    selectionRgb,
    focusedHeaderBackground,
  ] of cases) {
    await grid.evaluate((element, nextTheme) => {
      element.theme = nextTheme;
    }, theme);
    await page.waitForChanges();

    await expect(grid).toHaveAttribute('theme', theme);
    await expect(grid).toHaveAttribute('data-rg-theme-base', base);
    await expect(grid).toHaveAttribute('data-rg-theme-scheme', scheme);
    expect((await dataCell(page, 0, 0).boundingBox())?.height).toBe(rowHeight);
    await expect(page.locator('revogr-header').first()).toHaveCSS(
      'background-color',
      headerBackground,
    );
    await expect
      .poll(() =>
        grid.evaluate(element => {
          const style = getComputedStyle(element);
          return [
            style.getPropertyValue('--rg-theme-background').trim(),
            style.getPropertyValue('--rg-theme-selection-border').trim(),
          ];
        }),
      )
      .toEqual([background, selection]);
    await expect
      .poll(() =>
        page
          .locator(SELECTORS.focusedCell)
          .evaluate(element => getComputedStyle(element).boxShadow),
      )
      .toContain(selectionRgb);
    await expect(
      page.locator('revogr-header .rgHeaderCell.focused-cell').first(),
    ).toHaveCSS('background-color', focusedHeaderBackground);
  }
});

test('renders vertical cell separators in both high contrast presets', async ({
  page,
}) => {
  await mountGrid(page, {
    columns,
    source: [{ id: 1, name: 'Ada' }],
    theme: 'highContrast',
    themeDefinitions: modernThemeDefinitions,
  });

  const grid = page.locator(SELECTORS.grid);
  const firstCell = dataCell(page, 0, 0);
  const secondCell = dataCell(page, 0, 1);
  const cases = [
    ['highContrast', 'rgb(107, 114, 128)'],
    ['highContrastDark', 'rgb(115, 123, 135)'],
  ] as const;

  for (const [theme, color] of cases) {
    await grid.evaluate((element, nextTheme) => {
      element.theme = nextTheme;
    }, theme);
    await page.waitForChanges();

    const shadow = await firstCell.evaluate(
      element => getComputedStyle(element).boxShadow,
    );
    expect(shadow).toBe(`${color} -1px 0px 0px 0px inset`);
  }

  const firstBox = await firstCell.boundingBox();
  const secondBox = await secondCell.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(firstBox!.x + firstBox!.width).toBeCloseTo(secondBox!.x, 2);
});
