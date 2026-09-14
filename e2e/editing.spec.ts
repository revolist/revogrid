import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  buildColumns,
  cancelEditCellValue,
  dataCell,
  editCellValue,
  mountGrid,
  setCellsFocus,
  type SampleRow,
} from './helpers';

test.describe('editing', () => {
  test('commits edits and cancels Escape changes', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await editCellValue(page, 0, 'name', 'Alicia');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('Alicia');

    await cancelEditCellValue(page, 1, 'name', 'Benny');
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 1, 1)).toHaveText('Ben');
  });

  test('does not start editing from browser shortcut keys', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    const shortcutModifier =
      process.platform === 'darwin' ? 'Meta' : 'Control';

    await page.keyboard.press(`${shortcutModifier}+F`);
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    await page.keyboard.press('Escape');
    await page.keyboard.press(`${shortcutModifier}+P`);
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
  });

  test('starts editing from Enter and printable keyboard input', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Enter');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('Alice');

    await page.keyboard.press('Escape');
    await page.waitForChanges();

    await setCellsFocus(page, { x: 1, y: 1 });
    await page.keyboard.press('Z');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('Z');
  });

  test('does not scroll the grid when Space starts editing', async ({ page }) => {
    const source: SampleRow[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      name: `Person ${index + 1}`,
      role: 'Engineer',
      city: 'Lisbon',
    }));

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      height: 240,
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    const verticalViewport = page.locator(
      `${SELECTORS.mainViewport} .vertical-inner`,
    );
    await expect(verticalViewport).toHaveJSProperty('scrollTop', 0);

    await page.keyboard.press('Space');
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue(' ');
    await expect(verticalViewport).toHaveJSProperty('scrollTop', 0);
  });

  test('preserves Space scrolling when editing is readonly', async ({ page }) => {
    const source: SampleRow[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      name: `Person ${index + 1}`,
      role: 'Engineer',
      city: 'Lisbon',
    }));

    for (const readonlyMode of ['grid', 'column'] as const) {
      const columns = buildColumns([
        { prop: 'id', name: 'ID' },
        {
          prop: 'name',
          name: 'Name',
          readonly: readonlyMode === 'column',
        },
        { prop: 'role', name: 'Role' },
      ]);

      await mountGrid(page, {
        columns,
        source,
        height: 240,
        readonly: readonlyMode === 'grid',
      });

      await setCellsFocus(page, { x: 1, y: 0 });

      const verticalViewport = page.locator(
        `${SELECTORS.mainViewport} .vertical-inner`,
      );
      await verticalViewport.evaluate((element: HTMLElement) => {
        element.scrollTop = 0;
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      await page.waitForChanges();
      await expect(verticalViewport).toHaveJSProperty('scrollTop', 0);

      await page.keyboard.press('Space');
      await page.waitForChanges();

      await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
      await expect
        .poll(() =>
          verticalViewport.evaluate(
            (element: HTMLElement) => element.scrollTop,
          ),
        )
        .toBeGreaterThan(0);
    }
  });

  test('preserves Space scrolling when edit start is canceled', async ({ page }) => {
    const source: SampleRow[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      name: `Person ${index + 1}`,
      role: 'Engineer',
      city: 'Lisbon',
    }));

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
      height: 240,
    });

    await page.locator(SELECTORS.grid).evaluate((grid: HTMLRevoGridElement) => {
      grid.addEventListener(
        'beforeeditstart',
        event => event.preventDefault(),
        { once: true },
      );
    });
    await setCellsFocus(page, { x: 1, y: 0 });

    const verticalViewport = page.locator(
      `${SELECTORS.mainViewport} .vertical-inner`,
    );
    await expect(verticalViewport).toHaveJSProperty('scrollTop', 0);

    await page.keyboard.press('Space');
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect
      .poll(() =>
        verticalViewport.evaluate((element: HTMLElement) => element.scrollTop),
      )
      .toBeGreaterThan(0);
  });

  test('keeps rapid printable input while editor is mounting', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: '', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: '', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    const barcode = 'CHNLB10022502988';
    await page.evaluate((value) => {
      for (const key of value) {
        if (key >= 'A' && key <= 'Z') {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: 'Shift',
              code: 'ShiftLeft',
            }),
          );
        }

        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key,
            code: key >= 'A' && key <= 'Z' ? `Key${key}` : `Digit${key}`,
          }),
        );
      }
    }, barcode);
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue(barcode);

    await page.locator(SELECTORS.editInput).press('Enter');
    await page.waitForChanges();
    await expect(dataCell(page, 0, 1)).toHaveText(barcode);
  });

  test('keeps native input during the pending edit render handoff', async ({
    page,
  }) => {
    const source: SampleRow[] = [
      { id: 1, name: '', role: 'Engineer', city: 'Lisbon' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
    ]);

    await mountGrid(page, { columns, source });
    await setCellsFocus(page, { x: 1, y: 0 });

    const value = await page.evaluate(async () => {
      const editorMounted = new Promise<HTMLInputElement>(resolve => {
        const observer = new MutationObserver(() => {
          const input =
            document.querySelector<HTMLInputElement>('revogr-edit input');
          if (input) {
            observer.disconnect();
            resolve(input);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'C',
          code: 'KeyC',
        }),
      );

      const input = await editorMounted;
      input.addEventListener(
        'focus',
        () => {
          input.value += 'N';
          input.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              data: 'N',
              inputType: 'insertText',
            }),
          );
        },
        { once: true },
      );

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'H',
          code: 'KeyH',
        }),
      );

      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return input.value;
    });

    expect(value).toBe('CHN');
    await page.locator(SELECTORS.editInput).press('Enter');
    await page.waitForChanges();
    await expect(dataCell(page, 0, 1)).toHaveText('CHN');
  });

  test('commits buffered input when Enter arrives before editor focus', async ({
    page,
  }) => {
    const source: SampleRow[] = [
      { id: 1, name: '', role: 'Engineer', city: 'Lisbon' },
    ];
    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
    ]);

    await mountGrid(page, { columns, source });
    await setCellsFocus(page, { x: 1, y: 0 });

    await page.evaluate(async () => {
      const editorMounted = new Promise<void>(resolve => {
        const observer = new MutationObserver(() => {
          if (document.querySelector('revogr-edit input')) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });

      for (const [key, code] of [
        ['C', 'KeyC'],
        ['H', 'KeyH'],
      ]) {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key,
            code,
          }),
        );
        if (key === 'C') {
          await editorMounted;
        }
      }

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
        }),
      );
    });

    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expect(dataCell(page, 0, 1)).toHaveText('CH');
  });

  test('starts editing from AltGr printable characters', async ({ page }) => {
    const source: SampleRow[] = [
      { id: 1, name: 'Alice', role: 'Engineer', city: 'Lisbon' },
      { id: 2, name: 'Ben', role: 'Designer', city: 'Porto' },
    ];

    const columns = buildColumns([
      { prop: 'id', name: 'ID' },
      { prop: 'name', name: 'Name' },
      { prop: 'role', name: 'Role' },
    ]);

    await mountGrid(page, {
      columns,
      source,
    });

    await setCellsFocus(page, { x: 1, y: 0 });

    await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '@',
        code: 'KeyQ',
        ctrlKey: true,
        altKey: true,
      });
      Object.defineProperty(event, 'getModifierState', {
        value: (key: string) => key === 'AltGraph',
      });
      document.dispatchEvent(event);
    });
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toBeVisible();
    await expect(page.locator(SELECTORS.editInput)).toHaveValue('@');
  });
});
