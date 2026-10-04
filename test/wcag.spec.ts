import { WCAGPlugin } from '../src/plugins/wcag';
import { createStore } from '@stencil/store';

describe('WCAGPlugin', () => {
  it('counts pinned rows in global indices and tracks source replacements', () => {
    const revogrid = document.createElement('div') as HTMLRevoGridElement;
    const stores = {
      rowPinStart: { store: createStore({ source: [{}, {}] }) },
      rgRow: { store: createStore({ source: [{}, {}, {}] }) },
      rowPinEnd: { store: createStore({ source: [{}] }) },
    };
    const plugin = new WCAGPlugin(revogrid, { data: { stores } } as never);
    expect(revogrid.getAttribute('aria-rowcount')).toBe('6');

    const column: Record<string, any> = {};
    revogrid.dispatchEvent(
      new CustomEvent('beforecolumnsset', {
        detail: {
          columns: { colPinStart: [], rgCol: [column], colPinEnd: [] },
        },
      }),
    );
    for (const [type, index] of [
      ['rowPinStart', '1'],
      ['rgRow', '3'],
      ['rowPinEnd', '6'],
    ]) {
      expect(
        column.cellProperties({ type, rowIndex: 0 })['aria-rowindex'],
      ).toBe(index);
      const node = { $attrs$: {} };
      revogrid.dispatchEvent(
        new CustomEvent('beforerowrender', {
          detail: { node, rowType: type, item: { itemIndex: 0 } },
        }),
      );
      expect(node.$attrs$).toMatchObject({ 'aria-rowindex': index });
    }

    stores.rowPinStart.store.set('source', [{}]);
    expect(revogrid.getAttribute('aria-rowcount')).toBe('5');
    expect(
      column.cellProperties({ type: 'rgRow', rowIndex: 0 })['aria-rowindex'],
    ).toBe('2');
    plugin.destroy();
    stores.rgRow.store.set('source', []);
    expect(revogrid.getAttribute('aria-rowcount')).toBe('5');
  });

  it('uses one-based ARIA indices for headers, rows, and data cells', () => {
    const revogrid = document.createElement('div') as HTMLRevoGridElement;
    const firstColumn: Record<string, any> = {};
    const secondColumn: Record<string, any> = {};
    const store = {
      get: () => [],
      onChange: () => () => {},
    };
    new WCAGPlugin(revogrid, {
      data: {
        stores: {
          rowPinStart: { store },
          rgRow: { store },
          rowPinEnd: { store },
        },
      },
    } as never);

    revogrid.dispatchEvent(
      new CustomEvent('beforecolumnsset', {
        detail: {
          columns: {
            colPinStart: [],
            rgCol: [firstColumn, secondColumn],
            colPinEnd: [],
          },
        },
      }),
    );

    expect(firstColumn.columnProperties()).toMatchObject({
      'role': 'columnheader',
      'aria-colindex': '1',
    });
    expect(secondColumn.columnProperties()).toMatchObject({
      'aria-colindex': '2',
    });

    const firstCellProperties = firstColumn.cellProperties({ rowIndex: 0 });

    expect(firstCellProperties).toMatchObject({
      'role': 'gridcell',
      'aria-colindex': '1',
      'aria-rowindex': '1',
    });
    expect(secondColumn.cellProperties({ rowIndex: 4 })).toMatchObject({
      'aria-colindex': '2',
      'aria-rowindex': '5',
    });

    const node = { $attrs$: {} };
    revogrid.dispatchEvent(
      new CustomEvent('beforerowrender', {
        detail: {
          node,
          item: { itemIndex: 4 },
        },
      }),
    );

    expect(node.$attrs$).toMatchObject({
      'role': 'row',
      'aria-rowindex': '5',
    });
  });
});
