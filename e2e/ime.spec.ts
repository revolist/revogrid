import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import {
  dataCell,
  dispatchClipboardEvent,
  getCopiedText,
  mountGrid,
  setCellsFocus,
} from './helpers';

test('IME fast edit keeps the first Korean syllable in the same focused input', async ({
  page,
}) => {
  await mountGrid(page, {
    columns: [{ prop: 'name', name: 'Name' }],
    source: [{ name: 'Original' }, { name: 'Next' }],
  });
  await page.evaluate(() => {
    Object.assign(document.querySelector('revo-grid')!, { imeFastEdit: true });
  });
  await setCellsFocus(page, { x: 0, y: 0 });
  const input = page.locator('revogr-edit input');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('');

  // CDP drives Chromium's native composition/input events rather than merely
  // assigning a value, and requires an editable target before the first key.
  const session = await page.context().newCDPSession(page);
  await session.send('Input.imeSetComposition', {
    text: 'ㅇ',
    selectionStart: 1,
    selectionEnd: 1,
  });
  await page.evaluate(() => {
    (window as any).__imeInput = document.activeElement;
  });
  await page.waitForChanges();
  await expect(input).toBeFocused();
  await session.send('Input.imeSetComposition', {
    text: '안',
    selectionStart: 1,
    selectionEnd: 1,
  });
  await session.send('Input.insertText', { text: '안' });
  await session.send('Input.imeSetComposition', {
    text: '녕',
    selectionStart: 1,
    selectionEnd: 1,
  });
  await expect(input).toHaveValue('안녕');
  await page.evaluate(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        isComposing: true,
        bubbles: true,
      }),
    );
  });
  await expect(input).toHaveValue('안녕');
  await expect(dataCell(page, 0, 0)).toHaveText('Original');
  expect(
    await page.evaluate(
      () => document.activeElement === (window as any).__imeInput,
    ),
  ).toBe(true);
  await session.send('Input.insertText', { text: '녕' });
  await input.press('Enter');
  await page.waitForChanges();
  await expect(dataCell(page, 0, 0)).toHaveText('안녕');
});

async function readyGrid(page: Parameters<typeof mountGrid>[0]) {
  await mountGrid(page, {
    columns: [
      { prop: 'name', name: 'Name' },
      { prop: 'locked', readonly: true },
    ],
    source: [
      { name: 'Original', locked: 'Locked' },
      { name: 'Next', locked: 'Locked' },
    ],
  });
  await page.evaluate(() => {
    document.querySelector('revo-grid')!.imeFastEdit = true;
  });
  await setCellsFocus(page, { x: 0, y: 0 });
  await expect(page.locator('revogr-edit input')).toBeFocused();
}

test('IME fast edit preserves ordinary typing, Escape, Enter and navigation', async ({
  page,
}) => {
  await readyGrid(page);
  const input = page.locator('revogr-edit input');
  await page.keyboard.type('New');
  await expect(input).toHaveValue('New');
  await page.keyboard.press('Escape');
  await expect(input).toHaveValue('');
  await expect(dataCell(page, 0, 0)).toHaveText('Original');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Original');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(
      async () =>
        await page.evaluate(
          async () =>
            (await document.querySelector('revo-grid')!.getFocused())?.cell.y,
        ),
    )
    .toBe(1);
  await expect(input).toBeFocused();
  await page.keyboard.type('Saved');
  await page.keyboard.press('Tab');
  await expect(dataCell(page, 1, 0)).toHaveText('Saved');
  await expect(input).toHaveCount(0); // next column is readonly
});

test('IME fast edit respects edit vetoes and readonly grids', async ({
  page,
}) => {
  await readyGrid(page);
  await page.evaluate(() => {
    document
      .querySelector('revo-grid')!
      .addEventListener('beforeeditstart', e => e.preventDefault());
  });
  await page.keyboard.type('Rejected');
  await expect(dataCell(page, 0, 0)).toHaveText('Original');
  await expect(page.locator('revogr-edit')).toHaveClass(/ime-ready/);
  await page.evaluate(() => {
    document.querySelector('revo-grid')!.readonly = true;
  });
  await expect(page.locator('revogr-edit input')).toHaveCount(0);
});

test('IME fast edit keeps clipboard and clear actions on the selected cell', async ({
  page,
}) => {
  await readyGrid(page);
  expect(await getCopiedText(page)).toBe('Original');
  await dispatchClipboardEvent(page, 'paste', 'Pasted');
  await expect(dataCell(page, 0, 0)).toHaveText('Pasted');
  await expect(page.locator('revogr-edit')).toHaveClass(/ime-ready/);
  await page.keyboard.press('Delete');
  await expect(dataCell(page, 0, 0)).toHaveText('');
  await expect(page.locator('revogr-edit')).toHaveClass(/ime-ready/);
});

test('IME fast edit excludes custom editors and refocuses a clicked cell', async ({
  page,
}) => {
  await readyGrid(page);
  await dataCell(page, 0, 0).click();
  await expect(page.locator('revogr-edit input')).toBeFocused();
  await page.evaluate(() => {
    document.querySelector('revo-grid')!.columns = [
      {
        prop: 'name',
        editor: class {
          render(h: any) {
            return h('input', { 'data-custom-editor': true });
          }
        },
      },
    ];
  });
  await expect(page.locator('revogr-edit input')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-custom-editor]')).toHaveCount(1);
});

test('IME fast edit autosaves active edits but never empty ready inputs', async ({
  page,
}) => {
  await readyGrid(page);
  await page.evaluate(() => {
    document.querySelector('revo-grid')!.applyOnClose = true;
  });
  await setCellsFocus(page, { x: 0, y: 1 });
  await expect(dataCell(page, 0, 0)).toHaveText('Original');
  await page.keyboard.type('Autosaved');
  await setCellsFocus(page, { x: 0, y: 0 });
  await expect(dataCell(page, 1, 0)).toHaveText('Autosaved');
});

// Representative preedit/conversion sequences. CDP exercises the browser's
// composition lifecycle; it does not run an OS IME's conversion dictionary.
const compositionCases = [
  {
    language: 'Japanese',
    segments: [
      { preedit: ['n', 'に', 'にほん', '日本'], committed: '日本' },
      { preedit: ['g', 'ご', '語'], committed: '語' },
    ],
  },
  {
    language: 'Simplified Chinese',
    segments: [
      { preedit: ['n', 'ni', '你'], committed: '你' },
      { preedit: ['h', 'hao', '好'], committed: '好' },
    ],
  },
  {
    language: 'Traditional Chinese',
    segments: [
      { preedit: ['ㄓ', 'ㄓㄨㄥ', '中'], committed: '中' },
      { preedit: ['ㄨ', 'ㄨㄣ', '文'], committed: '文' },
    ],
  },
  {
    language: 'Hindi',
    segments: [
      { preedit: ['k', 'क', 'कि'], committed: 'कि' },
      { preedit: ['t', 'त', 'ताब'], committed: 'ताब' },
    ],
  },
  {
    language: 'Vietnamese',
    segments: [
      { preedit: ['t', 'tie', 'tiê', 'tiếng'], committed: 'tiếng' },
      { preedit: [' ', ' V', ' Việt'], committed: ' Việt' },
    ],
  },
  {
    language: 'French dead-key accents',
    segments: [
      { preedit: ['´', 'é'], committed: 'é' },
      { preedit: ['^', 'ê'], committed: 'ê' },
    ],
  },
];

for (const { language, segments } of compositionCases) {
  test(`IME fast edit preserves ${language} conversion, confirmation and cancellation`, async ({
    page,
  }) => {
    await readyGrid(page);
    const input = page.locator('revogr-edit input');
    const originalInput = await input.elementHandle();
    const session = await page.context().newCDPSession(page);
    let committed = '';

    for (const { preedit, committed: segment } of segments) {
      for (const text of preedit) {
        await session.send('Input.imeSetComposition', {
          text,
          selectionStart: text.length,
          selectionEnd: text.length,
        });
        await page.waitForChanges();
        await expect(input).toHaveValue(committed + text);
        await expect(input).toBeFocused();
        expect(
          await originalInput!.evaluate(el => el === document.activeElement),
        ).toBe(true);
      }

      // Candidate-confirmation/navigation keys belong to the IME. Include
      // legacy keyCode 229 without isComposing for older browser event paths.
      await input.evaluate(el => {
        for (const key of ['Enter', 'Tab', 'Escape', 'ArrowLeft']) {
          el.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              code: key,
              isComposing: true,
              bubbles: true,
              cancelable: true,
            }),
          );
        }
        el.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 229,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(input).toHaveValue(committed + preedit[preedit.length - 1]);
      await expect(input).toBeFocused();
      await expect(dataCell(page, 0, 0)).toHaveText('Original');
      await session.send('Input.insertText', { text: segment });
      committed += segment;
      await expect(input).toHaveValue(committed);
    }

    await input.press('Enter');
    await expect(dataCell(page, 0, 0)).toHaveText(committed);

    // A second edit must start clean, and cancelling a composition must not
    // replace the cell's existing value or leave preedit text in the next edit.
    await setCellsFocus(page, { x: 0, y: 1 });
    await expect(input).toBeFocused();
    await session.send('Input.imeSetComposition', {
      text: segments[0].preedit[0],
      selectionStart: 1,
      selectionEnd: 1,
    });
    await page.waitForChanges();
    await session.send('Input.imeSetComposition', {
      text: '',
      selectionStart: 0,
      selectionEnd: 0,
    });
    await input.press('Escape');
    await expect(dataCell(page, 1, 0)).toHaveText('Next');
    await expect(input).toHaveValue('');
    await expect(page.locator('revogr-edit')).toHaveClass(/ime-ready/);
    await session.detach();
  });
}
