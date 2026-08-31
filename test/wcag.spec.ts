import { WCAGPlugin } from '../src/plugins/wcag';

describe('WCAGPlugin', () => {
  it('uses one-based ARIA indices for headers, rows, and data cells', () => {
    const revogrid = document.createElement('div') as HTMLRevoGridElement;
    const firstColumn: Record<string, any> = {};
    const secondColumn: Record<string, any> = {};
    new WCAGPlugin(revogrid, {} as never);

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
