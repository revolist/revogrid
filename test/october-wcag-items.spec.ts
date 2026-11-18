import { WCAGPlugin } from '../src/plugins/wcag';
import { DataStore } from '../src/store/dataSource/data.store';
import ColumnDataProvider from '../src/services/column.data.provider';

describe('represented ARIA row counts', () => {
  it('uses real data-store updates, trimming and disposal without reacting to cell edits', () => {
    const grid = document.createElement('div') as HTMLRevoGridElement;
    const stores = { rowPinStart: new DataStore('rowPinStart'), rgRow: new DataStore('rgRow'), rowPinEnd: new DataStore('rowPinEnd') };
    stores.rowPinStart.updateData([{}]); stores.rgRow.updateData([{}, {}, {}]); stores.rowPinEnd.updateData([{}]);
    const plugin = new WCAGPlugin(grid, {
      data: { stores },
      column: new ColumnDataProvider(),
    } as never);
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(5);
    stores.rgRow.setSourceData({ 0: { edited: true } });
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(5);
    stores.rgRow.addTrimmed({ filter: { 0: true } });
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(4);
    stores.rgRow.addTrimmed({ grouping: { 1: true } });
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(3);
    stores.rgRow.addTrimmed({ filter: {}, grouping: {} });
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(5);
    stores.rowPinStart.updateData([{}, {}]);
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(6);
    plugin.destroy();
    const disposedRowCount = plugin.treegridAttributes['aria-rowcount'];
    stores.rgRow.addTrimmed({ filter: { 0: true } });
    expect(plugin.treegridAttributes['aria-rowcount']).toBe(disposedRowCount);
  });
});
