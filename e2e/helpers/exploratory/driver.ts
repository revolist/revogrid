import { expect } from '@playwright/test';
import type { E2EPage } from '@stencil/playwright';
import {
  SELECTORS,
  callGridMethod,
  cancelEditCellValue,
  dataCell,
  dispatchClipboardEvent,
  editCellValue,
  getSelectedRange,
  getVisibleSource,
  mountGrid,
  pinnedEndCell,
  pinnedStartCell,
  setCellsFocus,
} from '../../helpers';
import { defaultSize, GridModel, largeRowCount, makeRows, pinnedRow, type Row } from './model';
import type { Action } from './sequence';

const columns = [
  { prop: 'id', size: 100, readonly: true, sortable: true },
  { prop: 'name', size: 160 },
  { prop: 'team', size: 160 },
  { prop: 'status', size: 160, filter: true },
];

export type Fault = 'wrong-record' | 'stale-projection';

export async function mountExploratoryGrid(page: E2EPage) {
  // Stencil serves setContent via a URL fragment. Force a fresh document between scenarios.
  await page.mainFrame().goto('about:blank');
  await mountGrid(page, {
    ...defaultSize,
    columns,
    source: makeRows(),
    pinnedTopSource: [pinnedRow],
    range: true,
    rowSize: 28,
    resizeRow: { fullRow: true },
  });
}

export async function execute(page: E2EPage, model: GridModel, action: Exclude<Action, { kind: 'mount' }>) {
  const grid = page.locator(SELECTORS.grid);
  switch (action.kind) {
    case 'sort':
      await callGridMethod(page, 'updateColumnSorting', { prop: 'id' }, action.order, false);
      break;
    case 'trim':
      await callGridMethod(page, 'addTrimmed', action.index === null ? {} : { [model.trimIndex(action.index)]: true });
      break;
    case 'edit':
      await (action.cancel ? cancelEditCellValue : editCellValue)(page, action.row, 'name', action.value);
      break;
    case 'replaceDuringEdit':
      await grid.evaluate((element: HTMLRevoGridElement, source) => {
        element.addEventListener('beforeedit', event => {
          event.preventDefault();
          element.source = source;
        }, { once: true });
      }, makeRows(action.generation));
      await editCellValue(page, 0, 'name', 'discarded');
      break;
    case 'select':
      await setCellsFocus(page, { x: 1, y: 0 }, { x: 1, y: action.end });
      break;
    case 'paste':
      await dispatchClipboardEvent(page, 'paste', action.values.join('\n'));
      break;
    case 'churn': {
      const exposed = await grid.evaluate(async (element: HTMLRevoGridElement, { previous, latest, order }) => {
        const filter = (value: string) => ({
          multiFilterItems: { status: [{ id: 0, type: 'eq' as const, value, relation: 'and' as const }] },
        });
        // Keep the changes in one browser task while filtering and sorting are pending.
        element.filter = filter('Keep');
        element.source = previous;
        element.filter = false;
        element.filter = filter('Keep');
        const sampled = new Promise<number[]>(resolve => {
          element.addEventListener('aftersourceset', async () => {
            const visible = await element.getVisibleSource() as Row[];
            resolve(visible.filter(row => row.status !== 'Keep').slice(0, 5).map(row => row.id));
          }, { once: true });
        });
        element.source = latest;
        await element.updateColumnSorting({ prop: 'id' }, order, false);
        return sampled;
      }, {
        previous: makeRows(action.generation - 1, largeRowCount),
        latest: makeRows(action.generation, largeRowCount),
        order: action.order,
      });
      expect(exposed, 'Pending filter exposed unfiltered rows after source replacement').toEqual([]);
      break;
    }
    case 'beginResize': {
      const handle = grid.locator('revogr-data[type="rgRow"][col-type="rgCol"] .rgRow[data-rgrow="0"] > .row-resize-handle').first();
      await handle.hover({ position: { x: 10, y: 1 } });
      const box = await handle.boundingBox();
      if (!box) throw new Error('Row resize handle has no bounds');
      await page.mouse.down();
      await page.mouse.move(box.x + 10, box.y + 1 + action.delta, { steps: 4 });
      await expect.poll(async () => (await dataCell(page, 0, 0).boundingBox())?.height).toBeGreaterThan(28);
      break;
    }
    case 'group':
      await grid.evaluate((element: HTMLRevoGridElement) => {
        element.grouping = { props: ['team'], expandedAll: true };
      });
      await page.mouse.up();
      await expect.poll(async () => (await dataCell(page, 1, 0).boundingBox())?.height).toBeCloseTo(28, 0);
      break;
    case 'toggleNorth':
      await page.locator(SELECTORS.groupRows).filter({ hasText: 'North' }).locator(SELECTORS.groupExpandButton).click();
      break;
    case 'resize':
      await grid.evaluate((element, { width, height }) => {
        element.parentElement!.style.width = `${width}px`;
        element.parentElement!.style.height = `${height}px`;
      }, action);
      await expect.poll(() => grid.evaluate(element => [element.clientWidth, element.clientHeight]))
        .toEqual([action.width, action.height]);
      break;
    case 'scroll':
      await callGridMethod(page, 'scrollToRow', action.row);
      await callGridMethod(page, 'scrollToColumnIndex', action.column);
      await expect(dataCell(page, action.row, action.column)).toHaveText(model.visible()[action.row].status);
      break;
    case 'focus':
      await callGridMethod(page, 'scrollToRow', action.row);
      await dataCell(page, action.row, 1).click();
      break;
    case 'pin':
      await grid.evaluate((element: HTMLRevoGridElement, { columns, side }) => {
        element.columns = columns.map(column => column.prop === 'name' ? { ...column, pin: side } : column);
      }, { columns, side: action.side });
      break;
    case 'key':
      await page.keyboard.press(action.key);
      break;
  }
  await page.waitForChanges();
}

export async function injectFault(page: E2EPage, model: GridModel, action: Action, fault?: Fault) {
  if (fault === 'wrong-record' && action.kind === 'edit' && !action.cancel) {
    await callGridMethod(page, 'setDataAt', { row: action.row + 1, col: 1, val: 'wrong record probe' });
  }
  if (fault === 'stale-projection' && action.kind === 'churn') {
    await callGridMethod(page, 'clearSorting');
    await callGridMethod(page, 'updateColumnSorting', { prop: 'id' }, action.order === 'asc' ? 'desc' : 'asc', false);
    // Wait for a discriminating observation so the intended fault precedes the oracle.
    await expect.poll(async () => dataRows(await getVisibleSource<Row>(page))[0]?.id)
      .toBe(model.visible().at(-1)?.id);
  }
}

function dataRows(rows: Row[]) {
  return rows.filter(row => typeof row.id === 'number');
}

function firstMismatch<T>(expected: T[], actual: T[], key: (value: T) => string | number) {
  const index = expected.findIndex((value, index) => actual[index] === undefined || key(value) !== key(actual[index]));
  if (index !== -1) return { index, expected: expected[index], actual: actual[index] };
  return expected.length === actual.length ? null : { expectedCount: expected.length, actualCount: actual.length };
}

function rowKey({ id, name, team, status }: Row) {
  return JSON.stringify([id, name, team, status]);
}

export async function verifyGrid(page: E2EPage, model: GridModel) {
  const expected = model.visible().map(row => row.id);
  await expect.poll(async () => {
    const observed = dataRows(await getVisibleSource<Row>(page)).map(row => row.id);
    return firstMismatch(expected, observed, id => id);
  }, { message: 'Visible record order differs from the model' }).toBeNull();

  const source = dataRows(await callGridMethod<Row[]>(page, 'getSource')).sort((a, b) => a.id - b.id);
  expect(firstMismatch(model.rows, source, rowKey), 'Source record values differ from the model').toBeNull();
  expect(await callGridMethod(page, 'getSource', 'rowPinStart')).toEqual([pinnedRow]);

  if (model.focus !== undefined) {
    const x = model.pin ? 0 : 1;
    await expect.poll(() => getSelectedRange(page)).toMatchObject({
      x, y: model.focus, x1: x, y1: model.focus, colType: model.pin ?? 'rgCol', rowType: 'rgRow',
    });
    if (model.pin) {
      const locator = model.pin === 'colPinStart' ? pinnedStartCell : pinnedEndCell;
      await expect(locator(page, model.focus)).toHaveText(model.visible()[model.focus].name);
    }
  }
}
