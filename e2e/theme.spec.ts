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
  test('keeps user plugins working across plugin-free set changes', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
    });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      const state = {
        created: { a: 0, b: 0 },
        destroyed: { a: 0, b: 0 },
        handled: { a: 0, b: 0 },
      };
      const createPlugin = (name: 'a' | 'b') =>
        class {
          readonly lifecyclePluginName = name;
          private readonly listener = () => state.handled[name]++;

          constructor(private readonly grid: HTMLElement) {
            state.created[name]++;
            grid.addEventListener('themepluginprobe', this.listener);
          }

          destroy() {
            state.destroyed[name]++;
            this.grid.removeEventListener('themepluginprobe', this.listener);
          }
        };
      const PluginA = createPlugin('a');
      const PluginB = createPlugin('b');
      (globalThis as any).__userPluginLifecycle = {
        state,
        PluginA,
        PluginB,
      };
    });

    await expect
      .poll(() =>
        page.locator(SELECTORS.grid).evaluate(async (grid: any) => {
          const plugins = await grid.getPlugins();
          return {
            state: (globalThis as any).__userPluginLifecycle.state,
            active: plugins.filter(
              (plugin: { lifecyclePluginName?: string }) =>
                plugin.lifecyclePluginName,
            ).length,
          };
        }),
      )
      .toEqual({
        state: {
          created: { a: 0, b: 0 },
          destroyed: { a: 0, b: 0 },
          handled: { a: 0, b: 0 },
        },
        active: 0,
      });

    const updatePlugins = async (plugins: Array<'a' | 'b'>) => {
      await page.locator(SELECTORS.grid).evaluate((grid: any, names) => {
        const testState = (globalThis as any).__userPluginLifecycle;
        grid.plugins = names.map((name: 'a' | 'b') =>
          name === 'a' ? testState.PluginA : testState.PluginB,
        );
      }, plugins);
      await page.waitForChanges();
      await page.locator(SELECTORS.grid).dispatchEvent('themepluginprobe');
    };

    await updatePlugins(['a']);
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__userPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 1, b: 0 },
        destroyed: { a: 0, b: 0 },
        handled: { a: 1, b: 0 },
      });

    await updatePlugins(['a', 'b']);
    await updatePlugins(['b', 'a']);
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__userPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 1, b: 1 },
        destroyed: { a: 0, b: 0 },
        handled: { a: 3, b: 2 },
      });

    await updatePlugins(['b']);
    await updatePlugins([]);
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__userPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 1, b: 1 },
        destroyed: { a: 1, b: 1 },
        handled: { a: 3, b: 3 },
      });
  });

  test('keeps shared plugins until both user and theme owners release them', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
    });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      type Name = 'a' | 'b' | 'c' | 'd';
      const state = {
        created: { a: 0, b: 0, c: 0, d: 0 },
        destroyed: { a: 0, b: 0, c: 0, d: 0 },
        handled: { a: 0, b: 0, c: 0, d: 0 },
      };
      const createPlugin = (name: Name) =>
        class {
          readonly lifecyclePluginName = name;
          private readonly listener = () => state.handled[name]++;

          constructor(private readonly grid: HTMLElement) {
            state.created[name]++;
            grid.addEventListener('themepluginprobe', this.listener);
          }

          destroy() {
            state.destroyed[name]++;
            this.grid.removeEventListener('themepluginprobe', this.listener);
          }
        };
      const PluginA = createPlugin('a');
      const PluginB = createPlugin('b');
      const PluginC = createPlugin('c');
      const PluginD = createPlugin('d');
      grid.themeDefinitions = [
        {
          name: 'pluginAlpha',
          extends: 'material',
          plugins: [PluginA, PluginB],
        },
        {
          name: 'pluginBeta',
          extends: 'compact',
          plugins: [PluginB, PluginD],
        },
      ];
      grid.plugins = [PluginB, PluginC];
      (globalThis as any).__sharedPluginLifecycle = {
        state,
        PluginA,
        PluginB,
        PluginC,
        PluginD,
      };
    });
    await page.waitForChanges();

    const applyChange = async (
      change:
        | 'alpha'
        | 'default'
        | 'alphaWithoutB'
        | 'beta'
        | 'userAD'
        | 'clear',
    ) => {
      await page.locator(SELECTORS.grid).evaluate((grid: any, action) => {
        const testState = (globalThis as any).__sharedPluginLifecycle;
        if (action === 'alpha') {
          grid.theme = 'pluginAlpha';
        } else if (action === 'default') {
          grid.theme = 'default';
        } else if (action === 'alphaWithoutB') {
          grid.plugins = [testState.PluginC];
        } else if (action === 'beta') {
          grid.theme = 'pluginBeta';
        } else if (action === 'userAD') {
          grid.plugins = [testState.PluginA, testState.PluginD];
        } else {
          grid.plugins = [];
        }
      }, change);
      await page.waitForChanges();
      await page.locator(SELECTORS.grid).dispatchEvent('themepluginprobe');
    };

    await applyChange('alpha');
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__sharedPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 1, b: 1, c: 1, d: 0 },
        destroyed: { a: 0, b: 0, c: 0, d: 0 },
        handled: { a: 1, b: 1, c: 1, d: 0 },
      });

    await applyChange('default');
    await applyChange('alpha');
    await applyChange('alphaWithoutB');
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__sharedPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 2, b: 1, c: 1, d: 0 },
        destroyed: { a: 1, b: 0, c: 0, d: 0 },
        handled: { a: 3, b: 4, c: 4, d: 0 },
      });

    await applyChange('beta');
    await applyChange('userAD');
    await applyChange('default');
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__sharedPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 3, b: 1, c: 1, d: 1 },
        destroyed: { a: 2, b: 1, c: 1, d: 0 },
        handled: { a: 5, b: 6, c: 5, d: 3 },
      });

    await applyChange('clear');
    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__sharedPluginLifecycle.state),
      )
      .toEqual({
        created: { a: 3, b: 1, c: 1, d: 1 },
        destroyed: { a: 3, b: 1, c: 1, d: 1 },
        handled: { a: 5, b: 6, c: 5, d: 3 },
      });

    await expect
      .poll(() =>
        page.locator(SELECTORS.grid).evaluate(async (grid: any) => {
          const plugins = await grid.getPlugins();
          return plugins.filter(
            (plugin: { lifecyclePluginName?: string }) =>
              plugin.lifecyclePluginName,
          ).length;
        }),
      )
      .toBe(0);
  });

  test('owns inherited theme plugins across switching and definition updates', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
    });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      const state = {
        created: { parent: 0, shared: 0, child: 0 },
        destroyed: { parent: 0, shared: 0, child: 0 },
        events: [] as Array<{ detail: string; plugins: string[] }>,
      };
      const createPlugin = (name: 'parent' | 'shared' | 'child') =>
        class {
          readonly themePluginName = name;
          constructor() {
            state.created[name]++;
          }
          destroy() {
            state.destroyed[name]++;
          }
        };
      const ParentPlugin = createPlugin('parent');
      const SharedPlugin = createPlugin('shared');
      const ChildPlugin = createPlugin('child');
      const definitions = [
        {
          name: 'pluginParent',
          extends: 'material',
          plugins: [ParentPlugin, SharedPlugin],
        },
        {
          name: 'pluginChild',
          extends: 'pluginParent',
          plugins: [SharedPlugin, ChildPlugin],
        },
      ];

      grid.addEventListener('afterthemechanged', async (event: CustomEvent) => {
        const plugins = await grid.getPlugins();
        state.events.push({
          detail: event.detail,
          plugins: plugins
            .map(
              (plugin: { themePluginName?: string }) => plugin.themePluginName,
            )
            .filter(Boolean),
        });
      });
      grid.plugins = [SharedPlugin];
      grid.themeDefinitions = definitions;
      grid.theme = 'pluginChild';
      (globalThis as any).__themePluginTest = {
        state,
        ParentPlugin,
        SharedPlugin,
        definitions,
      };
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__themePluginTest.state),
      )
      .toMatchObject({
        created: { parent: 1, shared: 1, child: 1 },
        destroyed: { parent: 0, shared: 0, child: 0 },
        events: expect.arrayContaining([
          {
            detail: 'pluginChild',
            plugins: expect.arrayContaining(['parent', 'shared', 'child']),
          },
        ]),
      });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      const testState = (globalThis as any).__themePluginTest;
      grid.themeDefinitions = [
        testState.definitions[0],
        {
          name: 'pluginChild',
          extends: 'pluginParent',
          plugins: [testState.SharedPlugin],
        },
      ];
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = (globalThis as any).__themePluginTest.state;
          return {
            ...state,
            lastEvent: state.events[state.events.length - 1],
          };
        }),
      )
      .toMatchObject({
        created: { parent: 1, shared: 1, child: 1 },
        destroyed: { parent: 0, shared: 0, child: 1 },
        lastEvent: {
          detail: 'pluginChild',
          plugins: ['shared', 'parent'],
        },
      });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      grid.rowSize = 41;
      grid.theme = 'default';
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__themePluginTest.state),
      )
      .toMatchObject({
        created: { parent: 1, shared: 1, child: 1 },
        destroyed: { parent: 1, shared: 0, child: 1 },
      });

    await page.locator(SELECTORS.grid).evaluate((grid: any) => {
      grid.plugins = [];
    });
    await page.waitForChanges();

    await expect
      .poll(() =>
        page.evaluate(() => (globalThis as any).__themePluginTest.state),
      )
      .toMatchObject({
        destroyed: { parent: 1, shared: 1, child: 1 },
      });
  });

  test('isolates theme plugin instances per grid and restores them on reconnect', async ({
    page,
  }) => {
    await page.setContent(`
      <div id="first"><revo-grid></revo-grid></div>
      <div id="second"><revo-grid></revo-grid></div>
    `);
    await page.waitForSelector('revo-grid');

    await page.evaluate(() => {
      const state = { created: 0, destroyed: 0 };
      class ScopedPlugin {
        constructor() {
          state.created++;
        }
        destroy() {
          state.destroyed++;
        }
      }
      const definition = {
        name: 'scopedPlugins',
        extends: 'compact',
        plugins: [ScopedPlugin],
      };
      for (const grid of document.querySelectorAll<any>('revo-grid')) {
        grid.themeDefinitions = [definition];
        grid.theme = definition.name;
      }
      (globalThis as any).__scopedPluginTest = state;
    });
    await page.waitForChanges();

    await expect
      .poll(() => page.evaluate(() => (globalThis as any).__scopedPluginTest))
      .toEqual({ created: 2, destroyed: 0 });

    await page.evaluate(() => {
      const grids = document.querySelectorAll<any>('revo-grid');
      grids[0].theme = 'default';
    });
    await page.waitForChanges();
    await expect
      .poll(() => page.evaluate(() => (globalThis as any).__scopedPluginTest))
      .toEqual({ created: 2, destroyed: 1 });

    await page.evaluate(() => {
      const grid = document.querySelectorAll<any>('revo-grid')[1];
      const parent = grid.parentElement;
      grid.remove();
      parent.append(grid);
    });
    await page.waitForChanges();

    await expect
      .poll(() => page.evaluate(() => (globalThis as any).__scopedPluginTest))
      .toEqual({ created: 3, destroyed: 2 });
    await expect
      .poll(() =>
        page
          .locator('revo-grid')
          .nth(1)
          .evaluate(async (grid: any) => {
            const plugins = await grid.getPlugins();
            return plugins.filter(
              (plugin: object) => plugin.constructor.name === 'ScopedPlugin',
            ).length;
          }),
      )
      .toBe(1);
  });

  test('keeps the legacy CSS-only dark theme palette', async ({ page }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'dark',
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveAttribute('theme', 'dark');
    await expect(grid).not.toHaveAttribute('data-rg-theme-base');
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
            background: style.getPropertyValue('--rg-theme-background').trim(),
            border: style.getPropertyValue('--rg-theme-border').trim(),
            cellBorder: style.getPropertyValue('--rg-theme-cell-border').trim(),
            focused: style.getPropertyValue('--rg-theme-focused-bg').trim(),
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

  test('keeps resolved dark defaults available to legacy descendants', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'dark',
    });
    await page.addStyleTag({
      content: `
        .legacy-theme-consumer {
          background-color: var(--revo-grid-background, #fff) !important;
          color: var(--revo-grid-text, #000) !important;
          outline: 1px solid var(--revo-grid-cell-border) !important;
        }
      `,
    });

    const cell = dataCell(page, 0, 0);
    await cell.evaluate(element => {
      element.classList.add('legacy-theme-consumer');
    });

    await expect(cell).toHaveCSS('background-color', 'rgb(33, 37, 41)');
    await expect(cell).toHaveCSS('color', 'rgba(255, 255, 255, 0.9)');
    await expect(cell).toHaveCSS('outline-color', 'rgb(66, 66, 66)');
    await expect
      .poll(() =>
        cell.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            background: style.getPropertyValue('--revo-grid-background').trim(),
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

  test('inherits legacy dark custom properties from its wrapper', async ({
    page,
  }) => {
    await mountGrid(page, {
      columns,
      source: [{ id: 1, name: 'Ada' }],
      theme: 'dark',
    });
    await page.addStyleTag({
      content: `
        .dark-brand-shell {
          --revo-grid-background: rgb(10, 20, 30);
          --revo-grid-text: rgb(210, 220, 230);
          --revo-grid-cell-border: rgb(40, 50, 60);
          --revo-grid-focused-bg: rgba(70, 80, 90, 0.5);
        }
      `,
    });
    await page.locator(SELECTORS.grid).evaluate(grid => {
      grid.parentElement?.classList.add('dark-brand-shell');
    });

    const grid = page.locator(SELECTORS.grid);
    await expect(grid).toHaveCSS('background-color', 'rgb(10, 20, 30)');
    await expect(dataCell(page, 0, 0)).toHaveCSS('color', 'rgb(210, 220, 230)');
    await expect
      .poll(() =>
        grid.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            cellBorder: style.getPropertyValue('--rg-theme-cell-border').trim(),
            focused: style.getPropertyValue('--rg-theme-focused-bg').trim(),
          };
        }),
      )
      .toEqual({
        cellBorder: 'rgb(40, 50, 60)',
        focused: 'rgba(70, 80, 90, 0.5)',
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
    await expect(grid).not.toHaveAttribute('data-rg-theme-base');
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
    await expect(grid).not.toHaveAttribute('data-rg-theme-base');
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
    await expect(grid).not.toHaveAttribute('data-rg-theme-base');
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
    ['default', 'light', 27, 30],
    ['material', 'light', 42, 50],
    ['compact', 'light', 32, 45],
    ['darkMaterial', 'dark', 42, 50],
    ['darkCompact', 'dark', 32, 45],
  ] as const;

  for (const [theme, scheme, rowHeight, headerHeight] of cases) {
    await page.locator(SELECTORS.grid).evaluate((grid, nextTheme) => {
      grid.theme = nextTheme;
    }, theme);
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.grid)).toHaveAttribute('theme', theme);
    await expect(page.locator(SELECTORS.grid)).not.toHaveAttribute(
      'data-rg-theme-base',
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
  await expect(grid).not.toHaveAttribute('data-rg-theme-base');
  await setCellsFocus(page, { x: 0, y: 0 }, { x: 1, y: 0 });
  const cases = [
    [
      'ocean',
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
    await expect(grid).not.toHaveAttribute('data-rg-theme-base');
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
