import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  SELECTORS,
  SAMPLE_ROWS,
  basicColumns,
  callGridMethod,
  dataCell,
  dispatchClipboardEvent,
  expectFocusedCell,
  expectSelectedRange,
  getCopiedText,
  getCutText,
  getFirefoxCopiedText,
  mountGrid,
  pinnedBottomCell,
  pinnedCornerCell,
  pinnedEndCell,
  pinnedStartCell,
  pinnedTopCell,
  setCellsFocus,
} from './helpers';

test.describe('clipboard', () => {
  test('pastes into the current visible rows when trimming changes after selection', async ({ page }) => {
    const source = [
      { id: 1, name: 'First', role: 'Engineer' },
      { id: 2, name: 'Hidden', role: 'Designer' },
      { id: 3, name: 'Third', role: 'Manager' },
      { id: 4, name: 'Neighbor', role: 'Analyst' },
    ];
    const pinnedTopSource = [{ id: 5, name: 'Pinned', role: 'Lead' }];
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source,
      pinnedTopSource,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 1, y: 1 });
    await callGridMethod(page, 'addTrimmed', { 1: true });
    await page.waitForChanges();
    await expect(dataCell(page, 1, 1)).toHaveText('Third');
    await dispatchClipboardEvent(page, 'paste', 'Updated first\nUpdated third');

    expect(await callGridMethod(page, 'getSource')).toEqual([
      { ...source[0], name: 'Updated first' },
      source[1],
      { ...source[2], name: 'Updated third' },
      source[3],
    ]);
    expect(await callGridMethod(page, 'getSource', 'rowPinStart')).toEqual(pinnedTopSource);
  });

  test('round-trips copied cells containing tabs, line breaks, quotes, and empty values', async ({ page }) => {
    const values = [
      { id: 'tab\tvalue', name: 'line\nvalue', role: 'say "hi"' },
      { id: 'CR\rvalue', name: 'CRLF\r\nvalue', role: '' },
    ];
    const blank = { id: '', name: '', role: '' };
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: [
        ...values,
        { ...blank },
        { ...blank },
        { id: 'untouched', name: 'untouched', role: 'untouched' },
      ],
      range: true,
    });

    await setCellsFocus(page, { x: 0, y: 0 }, { x: 2, y: 1 });
    const copiedText = await getCopiedText(page);
    expect(copiedText).toBe(
      '"tab\tvalue"\t"line\nvalue"\t"say ""hi"""\n"CR\rvalue"\t"CRLF\r\nvalue"\t',
    );
    await setCellsFocus(page, { x: 0, y: 2 });
    await dispatchClipboardEvent(page, 'paste', copiedText);

    const source = await page.locator('revo-grid').evaluate(
      grid => (grid as HTMLRevoGridElement).source,
    );
    expect(source.slice(2, 4)).toEqual(values);
    expect(source[4]).toEqual({ id: 'untouched', name: 'untouched', role: 'untouched' });
  });

  test('copies the selected range as tabular text', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);
    const copiedText = await getCopiedText(page);
    await expect(copiedText).toBe('Alice\tEngineer\nBen\tDesigner');
  });

  test('copies the focused cell as tabular text without starting edit', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Control+C');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    const copiedText = await getCopiedText(page);
    await expect(copiedText).toBe('Alice');
  });

  test('writes clipboard data during the canceled copy event', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    const copiedText = await getFirefoxCopiedText(page);
    await expect(copiedText).toBe('Alice\tEngineer\nBen\tDesigner');
  });

  test('preserves custom clipboard text when copyregion is canceled', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });
    await setCellsFocus(page, { x: 1, y: 0 });
    await page.locator('revo-grid').evaluate(grid => {
      grid.addEventListener(
        'copyregion',
        event => {
          event.preventDefault();
          (event as CustomEvent<DataTransfer>).detail.setData(
            'text/plain',
            'Custom clipboard text',
          );
        },
        { once: true },
      );
    });

    expect(await getFirefoxCopiedText(page)).toBe('Custom clipboard text');
  });

  test('pastes tabular data into the focused cell from keyboard paste flow', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.trio,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 1 });
    await page.keyboard.press('Control+V');
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    await dispatchClipboardEvent(page, 'paste', 'Nia\tQA\nOla\tPM');

    await expect(dataCell(page, 1, 1)).toHaveText('Nia');
    await expect(dataCell(page, 1, 2)).toHaveText('QA');
    await expect(dataCell(page, 2, 1)).toHaveText('Ola');
    await expect(dataCell(page, 2, 2)).toHaveText('PM');
  });

  test('recognizes remapped Latin and physical non-Latin paste shortcuts', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });
    await setCellsFocus(page, { x: 1, y: 0 });

    const pasteKeys = await page.locator('revo-grid').evaluate(grid => {
      const recognized: string[] = [];
      let currentKey: string;
      grid.addEventListener('beforepasteregion', () => recognized.push(currentKey));
      for (const init of [
        { code: 'KeyV', key: 'k', ctrlKey: true },
        { code: 'KeyV', key: 'é', ctrlKey: true },
        { code: 'KeyK', key: 'v', ctrlKey: true },
        { code: 'KeyK', key: 'V', metaKey: true, shiftKey: true },
        { code: 'KeyV', key: 'м', ctrlKey: true },
        { code: 'KeyK', key: 'м', ctrlKey: true },
      ]) {
        currentKey = init.key;
        document.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ...init,
        }));
      }
      return recognized;
    });

    expect(pasteKeys).toEqual(['v', 'V', 'м']);
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
  });

  test('emits afterpasteapply with the replaced paste data', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.trio,
      range: true,
    });
    await page.evaluate(() => {
      const grid = document.querySelector('revo-grid') as HTMLElement;
      (window as any).__afterPaste = null;
      grid.addEventListener('beforepasteapply', (e: Event) => {
        (e as CustomEvent).detail.parsed = [['Replaced']];
      });
      grid.addEventListener('afterpasteapply', (e: Event) => {
        (window as any).__afterPaste = (e as CustomEvent).detail.parsed;
      });
    });
    await setCellsFocus(page, { x: 1, y: 1 });
    await dispatchClipboardEvent(page, 'paste', 'Nia\tQA');

    await expect(dataCell(page, 1, 1)).toHaveText('Replaced');
    expect(await page.evaluate(() => (window as any).__afterPaste)).toEqual([['Replaced']]);
  });

  test('cuts the selected range as tabular text and clears the source cells', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'KeyX',
          key: 'x',
          ctrlKey: true,
        }),
      );
    });
    await page.waitForChanges();
    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);

    const cutText = await getCutText(page);

    await expect(cutText).toBe('Alice\tEngineer\nBen\tDesigner');
    await expect(dataCell(page, 0, 1)).toHaveText('');
    await expect(dataCell(page, 0, 2)).toHaveText('');
    await expect(dataCell(page, 1, 1)).toHaveText('');
    await expect(dataCell(page, 1, 2)).toHaveText('');
  });

  test('clears focused and ranged cells with keyboard clear keys', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Backspace');
    await page.waitForChanges();
    await expect(dataCell(page, 0, 1)).toHaveText('');

    await setCellsFocus(page, { x: 1, y: 0 }, { x: 2, y: 1 });
    await page.keyboard.press('Delete');
    await page.waitForChanges();

    await expect(dataCell(page, 0, 1)).toHaveText('');
    await expect(dataCell(page, 0, 2)).toHaveText('');
    await expect(dataCell(page, 1, 1)).toHaveText('');
    await expect(dataCell(page, 1, 2)).toHaveText('');
  });

  test('selects the full grid range with Cmd/Ctrl+A and preserves focus', async ({ page }) => {
    await mountGrid(page, {
      columns: basicColumns(['id', 'name', 'role']),
      source: SAMPLE_ROWS.pair,
      range: true,
    });

    await setCellsFocus(page, { x: 1, y: 0 });
    await page.keyboard.press('Meta+A');
    await page.waitForChanges();

    await expect(page.locator(SELECTORS.editInput)).toHaveCount(0);
    await expectSelectedRange(page, {
      x: 0,
      y: 0,
      x1: 2,
      y1: 1,
    });
    await expectFocusedCell(page, { x: 1, y: 0 });
    await expect(
      page.locator(SELECTORS.selectedRange),
    ).toHaveCount(1);

    await setCellsFocus(page, { x: 2, y: 1 });
    await page.keyboard.press('Control+A');
    await page.waitForChanges();

    await expectSelectedRange(page, {
      x: 0,
      y: 0,
      x1: 2,
      y1: 1,
    });
    await expectFocusedCell(page, { x: 2, y: 1 });
    await expect(page.locator(SELECTORS.selectedRange)).toHaveCount(1);
  });

  test('clears every pinned and regular partition after Cmd+A', async ({
    page,
  }) => {
    const columns = [
      { prop: 'a', name: 'A', pin: 'colPinStart' as const },
      { prop: 'c', name: 'C' },
      { prop: 'd', name: 'D' },
      { prop: 'b', name: 'B', pin: 'colPinEnd' as const },
    ];
    const row = (prefix: string) => ({
      a: `${prefix}-a`,
      b: `${prefix}-b`,
      c: `${prefix}-c`,
      d: `${prefix}-d`,
    });

    await mountGrid(page, {
      columns,
      source: [row('main-1'), row('main-2')],
      pinnedTopSource: [row('top')],
      pinnedBottomSource: [row('bottom')],
      range: true,
      width: 520,
      height: 300,
    });

    await setCellsFocus(page, { x: 0, y: 0 });
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Delete');
    await page.waitForChanges();

    const clearedCells = [
      dataCell(page, 0, 0),
      dataCell(page, 0, 1),
      pinnedStartCell(page, 0),
      pinnedEndCell(page, 0),
      pinnedTopCell(page, 0, 0),
      pinnedTopCell(page, 0, 1),
      pinnedBottomCell(page, 0, 0),
      pinnedBottomCell(page, 0, 1),
      pinnedCornerCell(page, 'rowPinStart', 'colPinStart', 0),
      pinnedCornerCell(page, 'rowPinStart', 'colPinEnd', 0),
      pinnedCornerCell(page, 'rowPinEnd', 'colPinStart', 0),
      pinnedCornerCell(page, 'rowPinEnd', 'colPinEnd', 0),
    ];

    for (const cell of clearedCells) {
      await expect(cell).toHaveText('');
    }
  });
});
