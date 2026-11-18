import { WCAGPlugin } from '../src/plugins/wcag';
import { createStore } from '@stencil/store';
import ColumnDataProvider from '../src/services/column.data.provider';

describe('WCAGPlugin', () => {
  it('counts represented pinned rows in global indices and tracks item replacements', () => {
    const revogrid = document.createElement('div') as HTMLRevoGridElement;
    const stores = {
      rowPinStart: { store: createStore({ source: [{}, {}], items: [0, 1] }) },
      rgRow: { store: createStore({ source: [{}, {}, {}], items: [0, 1, 2] }) },
      rowPinEnd: { store: createStore({ source: [{}], items: [0] }) },
    };
    const columnProvider = new ColumnDataProvider();
    columnProvider.stores.colPinStart.updateData([{ prop: 'id' }]);
    const plugin = new WCAGPlugin(revogrid, {
      data: { stores },
      column: columnProvider,
    } as never);
    expect(plugin.treegridAttributes).toMatchObject({
      'aria-rowcount': 7,
      'aria-colcount': 1,
    });
    const sourceReads = Object.values(stores).map(({ store }) =>
      jest.spyOn(store, 'get'),
    );

    const column: Record<string, any> = {};
    revogrid.dispatchEvent(
      new CustomEvent('beforecolumnsset', {
        detail: {
          columns: { colPinStart: [], rgCol: [column], colPinEnd: [] },
        },
      }),
    );
    for (const [type, index] of [
      ['rowPinStart', '2'],
      ['rgRow', '4'],
      ['rowPinEnd', '7'],
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

    for (const sourceRead of sourceReads) {
      expect(sourceRead).not.toHaveBeenCalled();
    }
    stores.rgRow.store.set('source', [{ edited: true }, {}, {}, {}]);
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(7);

    stores.rowPinStart.store.set('items', [0]);
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(6);
    expect(
      column.cellProperties({ type: 'rgRow', rowIndex: 0 })['aria-rowindex'],
    ).toBe('3');
    plugin.destroy();
    const disposedRowCount = plugin.treegridAttributes['aria-rowcount'];
    stores.rgRow.store.set('items', [0, 1]);
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(disposedRowCount);
  });

  it('uses one-based ARIA indices for headers, rows, and data cells', () => {
    const revogrid = document.createElement('div') as HTMLRevoGridElement;
    const firstColumn: Record<string, any> = {};
    const secondColumn: Record<string, any> = {};
    const store = {
      get: () => [],
      onChange: () => () => {},
    };
    const plugin = new WCAGPlugin(revogrid, {
      column: new ColumnDataProvider(),
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

    expect(plugin.treegridAttributes['aria-colcount']).toBe(2);
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
