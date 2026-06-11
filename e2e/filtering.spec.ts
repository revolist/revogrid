import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  dataCell,
  expectVisibleColumnValues,
  mainDataRows,
  mountGrid,
  withHeaderTestId,
  type SampleRow,
} from './helpers';

test.describe('filtering', () => {
  test('filters rows correctly', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
      { id: 504, name: 'Dan', role: 'Designer', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID', ...withHeaderTestId('filter-header-id') },
      { prop: 'name', name: 'Name', ...withHeaderTestId('filter-header-name') },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('filter-header-role') },
      { prop: 'city', name: 'City', ...withHeaderTestId('filter-header-city') },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);

    await page
      .getByTestId('filter-header-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await expect(filterPanel.locator('.reorder-button')).toHaveCount(0);
    await page.locator(SELECTORS.filterInput).fill('Admin');

    await expectVisibleColumnValues(page, 1, ['Alice', 'Cara']);
    await expect(mainDataRows(page)).toHaveCount(2);
    await expect(dataCell(page, 0, 1)).toHaveText('Alice');
    await expect(dataCell(page, 1, 1)).toHaveText('Cara');

    await filterPanel.getByRole('button', { name: 'reset' }).click();
    await expectVisibleColumnValues(page, 1, ['Alice', 'Ben', 'Cara', 'Dan']);
    await expect(mainDataRows(page)).toHaveCount(4);
  });

  test('toggles filter panel when clicking the same filter button twice', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('toggle-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    const filterButton = page
      .getByTestId('toggle-filter-role')
      .locator(SELECTORS.filterButton);
    const filterPanel = page.locator(SELECTORS.filterPanel);

    await filterButton.click();
    await expect(filterPanel).toBeVisible();

    await filterButton.click();
    await expect(filterPanel).not.toBeVisible();
  });

  test('closes an open filter panel when opening another grid filter panel', async ({ page }) => {
    await page.evaluate(() => {
      customElements.define(
        'shadow-grid-host',
        class extends HTMLElement {
          connectedCallback() {
            const root = this.attachShadow({ mode: 'open' });
            root.innerHTML = `
              <div style="display: grid; gap: 24px; width: 900px;">
                <div style="height: 180px;">
                  <revo-grid filter style="display:block; width:100%; height:100%;"></revo-grid>
                </div>
                <div style="height: 180px;">
                  <revo-grid filter style="display:block; width:100%; height:100%;"></revo-grid>
                </div>
              </div>
            `;
          }
        },
      );
    });
    await page.setContent('<shadow-grid-host></shadow-grid-host>');
    await page.waitForSelector('shadow-grid-host revo-grid');

    await page.evaluate(() => {
      const grids = Array.from(
        document
          .querySelector('shadow-grid-host')
          ?.shadowRoot
          ?.querySelectorAll<HTMLRevoGridElement>('revo-grid') ?? [],
      );
      if (grids.length !== 2) {
        throw new Error('Two grid instances were not created');
      }

      const source = [
        { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
        { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      ];

      grids.forEach((grid, index) => {
        const prefix = index === 0 ? 'first' : 'second';
        grid.columns = [
          { prop: 'id', name: 'ID' },
          { prop: 'name', name: 'Name' },
          {
            prop: 'role',
            name: 'Role',
            filter: true,
            columnProperties: () => ({ 'data-testid': `${prefix}-filter-role` }),
          },
          { prop: 'city', name: 'City' },
        ];
        grid.source = source;
        grid.filter = true;
      });
    });
    await page.waitForChanges();

    const openFilterPanels = page.locator(`${SELECTORS.filterPanel}[open]`);

    await page
      .getByTestId('first-filter-role')
      .locator(SELECTORS.filterButton)
      .click();
    await expect(openFilterPanels).toHaveCount(1);

    await page
      .getByTestId('second-filter-role')
      .locator(SELECTORS.filterButton)
      .click();
    await expect(openFilterPanels).toHaveCount(1);

    await expect(
      page.locator('shadow-grid-host revo-grid').nth(0).locator(`${SELECTORS.filterPanel}[open]`),
    ).toHaveCount(0);
    await expect(
      page.locator('shadow-grid-host revo-grid').nth(1).locator(`${SELECTORS.filterPanel}[open]`),
    ).toHaveCount(1);
  });

  test('renders filter panel as a native dialog outside overflow clipping', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('dialog-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true, height: 72 });
    await page.locator('revo-grid').evaluate(grid => {
      const wrapper = grid.parentElement;
      if (!wrapper) {
        throw new Error('Grid wrapper was not found');
      }
      wrapper.style.overflow = 'hidden';
    });

    await page
      .getByTestId('dialog-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await expect(filterPanel).toHaveJSProperty('open', true);

    const { buttonBottom, buttonLeft, panelBottom, panelLeft, panelTop, wrapperBottom } = await page.evaluate(() => {
      const dialog = document.querySelector('revogr-filter-panel dialog');
      const button = document
        .querySelector('[data-testid="dialog-filter-role"]')
        ?.querySelector('.rv-filter');
      const wrapper = document.querySelector('revo-grid')?.parentElement;
      if (!button || !dialog || !wrapper) {
        throw new Error('Filter button, dialog, or grid wrapper was not found');
      }
      const buttonRect = button.getBoundingClientRect();
      const panelRect = dialog.getBoundingClientRect();
      return {
        buttonBottom: buttonRect.bottom,
        buttonLeft: buttonRect.left,
        panelBottom: panelRect.bottom,
        panelLeft: panelRect.left,
        panelTop: panelRect.top,
        wrapperBottom: wrapper.getBoundingClientRect().bottom,
      };
    });

    expect(Math.abs(panelLeft - buttonLeft)).toBeLessThanOrEqual(4);
    expect(Math.abs(panelTop - buttonBottom)).toBeLessThanOrEqual(4);
    expect(panelBottom).toBeGreaterThan(wrapperBottom);
  });

  test('flips filter dialog above the button near the viewport bottom', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 260 });

    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('bottom-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true, height: 160 });
    await page.locator('revo-grid').evaluate(grid => {
      const wrapper = grid.parentElement;
      if (!wrapper) {
        throw new Error('Grid wrapper was not found');
      }
      wrapper.style.marginTop = '160px';
    });

    await page
      .getByTestId('bottom-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();

    const { actionBottom, buttonTop, panelBottom, panelTop, viewportBottom } = await page.evaluate(() => {
      const dialog = document.querySelector('revogr-filter-panel dialog');
      const button = document
        .querySelector('[data-testid="bottom-filter-role"]')
        ?.querySelector('.rv-filter');
      const actions = dialog?.querySelector('.filter-actions');
      if (!button || !dialog || !actions) {
        throw new Error('Filter button, dialog, or filter actions were not found');
      }
      const buttonRect = button.getBoundingClientRect();
      const panelRect = dialog.getBoundingClientRect();
      const actionRect = actions.getBoundingClientRect();
      return {
        actionBottom: actionRect.bottom,
        buttonTop: buttonRect.top,
        panelBottom: panelRect.bottom,
        panelTop: panelRect.top,
        viewportBottom: window.innerHeight,
      };
    });

    expect(panelTop).toBeGreaterThanOrEqual(8);
    expect(panelBottom).toBeLessThanOrEqual(buttonTop + 3);
    expect(panelBottom).toBeLessThanOrEqual(viewportBottom - 8);
    expect(Math.abs(actionBottom - panelBottom)).toBeLessThanOrEqual(2);
  });

  test('renders filter condition actions outside select input on the same row', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('layout-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: {
        localization: {
          captions: {
            filterCondition: 'Condition',
          },
        },
      },
    });

    await page
      .getByTestId('layout-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await filterPanel.locator('#add-filter').selectOption({ label: 'Equal' });

    const row = filterPanel.locator('.multi-filter-list-row').first();
    await expect(row).toBeVisible();
    await expect(row.locator(':scope > .reorder-button')).toHaveCount(1);
    await expect(row.locator(':scope > .select-input')).toHaveCount(1);
    await expect(row.locator(':scope > .multi-filter-list-action')).toHaveCount(1);
    await expect(row.locator('.select-input .multi-filter-list-action')).toHaveCount(0);
    await expect(row.locator('.select-input .trash-button')).toHaveCount(0);
    await expect(row.locator(':scope > .multi-filter-list-action .trash-button')).toHaveCount(1);
    await expect(row.locator(':scope > .multi-filter-list-action .and-or-button')).toHaveCount(1);

    const isSingleRow = await row.evaluate((element) => {
      const editableControls = element.querySelector('.select-input');
      const actions = element.querySelector('.multi-filter-list-action');
      if (!editableControls || !actions) {
        return false;
      }
      const editableBox = editableControls.getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      return (
        Math.abs(editableBox.top - actionsBox.top) <= 1 &&
        Math.abs(editableBox.height - actionsBox.height) <= 8 &&
        actionsBox.left >= editableBox.right
      );
    });
    expect(isSingleRow).toBe(true);
  });

  test('reorders filter conditions with the drag handle', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('reorder-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    await page
      .getByTestId('reorder-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    const filterInputs = page.locator(SELECTORS.filterInput);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await filterInputs.fill('Admin');
    await filterPanel.locator('#add-filter').selectOption({ label: 'Equal' });
    await filterInputs.nth(1).fill('Engineer');

    await expect(filterPanel.locator('.multi-filter-list-row')).toHaveCount(2);
    await expect(filterPanel.getByRole('listitem', { name: 'Condition 1' })).toBeVisible();
    await expect(filterPanel.getByRole('listitem', { name: 'Condition 2' })).toBeVisible();
    await expect(filterPanel.locator('.select-filter').nth(0)).toHaveValue('contains');
    await expect(filterPanel.locator('.select-filter').nth(1)).toHaveValue('eq');

    await filterPanel.evaluate((panel) => {
      const rows = Array.from(panel.querySelectorAll('.multi-filter-list-row'));
      const sourceHandle = rows[1].querySelector('.reorder-button');
      const targetDrop = rows[0].querySelector('.filter-row-drop-target');
      if (!sourceHandle || !targetDrop) {
        throw new Error('Filter reorder controls were not found');
      }
      const dataTransfer = new DataTransfer();
      sourceHandle.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      targetDrop.dispatchEvent(new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    });

    await expect(filterPanel.locator('.multi-filter-list-row').nth(0)).toHaveClass(/filter-row-drag-over/);

    await filterPanel.evaluate((panel) => {
      const rows = Array.from(panel.querySelectorAll('.multi-filter-list-row'));
      const sourceHandle = rows[1].querySelector('.reorder-button');
      const targetDrop = rows[0].querySelector('.filter-row-drop-target');
      if (!sourceHandle || !targetDrop) {
        throw new Error('Filter reorder controls were not found');
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', '2');
      targetDrop.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      sourceHandle.dispatchEvent(new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    });

    await expect(filterPanel.locator('.filter-row-drag-over')).toHaveCount(0);
    await expect(filterPanel.locator('.select-filter').nth(0)).toHaveValue('eq');
    await expect(filterPanel.locator('.select-filter').nth(1)).toHaveValue('contains');
    await expect(filterInputs.nth(0)).toHaveValue('Engineer');
    await expect(filterInputs.nth(1)).toHaveValue('Admin');

    await filterPanel.locator('.reorder-button').first().focus();
    await page.keyboard.press('ArrowDown');

    await expect(filterPanel.locator('.select-filter').nth(0)).toHaveValue('contains');
    await expect(filterPanel.locator('.select-filter').nth(1)).toHaveValue('eq');
    await expect(filterInputs.nth(0)).toHaveValue('Admin');
    await expect(filterInputs.nth(1)).toHaveValue('Engineer');
  });

  test('reapplies active filters after source replacement', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
      { id: 504, name: 'Dan', role: 'Designer', city: 'Coimbra' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true, ...withHeaderTestId('source-filter-role') },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, { columns, source, filter: true });

    await page
      .getByTestId('source-filter-role')
      .locator(SELECTORS.filterButton)
      .click();

    const filterPanel = page.locator(SELECTORS.filterPanel);
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('combobox').selectOption({ label: 'Contains' });
    await page.locator(SELECTORS.filterInput).fill('Admin');

    await expectVisibleColumnValues(page, 1, ['Alice', 'Cara']);

    await filterPanel.getByRole('button', { name: 'ok' }).click();
    await expect(filterPanel).not.toBeVisible();

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 601, name: 'Eve', role: 'Admin', city: 'Madrid' },
        { id: 602, name: 'Finn', role: 'Engineer', city: 'Paris' },
        { id: 603, name: 'Gia', role: 'Admin', city: 'Rome' },
      ];
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, ['Eve', 'Gia']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });

  test('reapplies programmatic filters after source replacement', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 501, name: 'Alice', role: 'Admin', city: 'Lisbon' },
      { id: 502, name: 'Ben', role: 'Engineer', city: 'Porto' },
      { id: 503, name: 'Cara', role: 'Admin', city: 'Braga' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role', filter: true },
      { prop: 'city', name: 'City' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      filter: true,
    });

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.dispatchEvent(
        new CustomEvent('filter', {
          detail: {
            role: [
              {
                id: 0,
                type: 'contains',
                value: 'Manager',
                relation: 'and',
              },
            ],
          },
        }),
      );
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, []);
    await expect(mainDataRows(page)).toHaveCount(0);

    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLRevoGridElement | null;
      if (!grid) {
        throw new Error('Grid was not found');
      }
      grid.source = [
        { id: 601, name: 'Eve', role: 'Manager', city: 'Madrid' },
        { id: 602, name: 'Finn', role: 'Engineer', city: 'Paris' },
        { id: 603, name: 'Gia', role: 'Manager', city: 'Rome' },
      ];
    });
    await page.waitForChanges();

    await expectVisibleColumnValues(page, 1, ['Eve', 'Gia']);
    await expect(mainDataRows(page)).toHaveCount(2);
  });
});
