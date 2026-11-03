import { WCAGPlugin } from '../src/plugins/wcag';
import { DataStore } from '../src/store/dataSource/data.store';

describe('represented ARIA row counts', () => {
  it('uses real data-store updates, trimming and disposal without reacting to cell edits', () => {
    const grid = document.createElement('div') as HTMLRevoGridElement;
    const stores = { rowPinStart: new DataStore('rowPinStart'), rgRow: new DataStore('rgRow'), rowPinEnd: new DataStore('rowPinEnd') };
    stores.rowPinStart.updateData([{}]); stores.rgRow.updateData([{}, {}, {}]); stores.rowPinEnd.updateData([{}]);
    const plugin = new WCAGPlugin(grid, { data: { stores } } as never);
    expect(grid.getAttribute('aria-rowcount')).toBe('5');
    const setAttribute = jest.spyOn(grid, 'setAttribute');
    stores.rgRow.setSourceData({ 0: { edited: true } });
    expect(setAttribute).not.toHaveBeenCalled();
    stores.rgRow.addTrimmed({ filter: { 0: true } });
    expect(grid.getAttribute('aria-rowcount')).toBe('4');
    stores.rgRow.addTrimmed({ grouping: { 1: true } });
    expect(grid.getAttribute('aria-rowcount')).toBe('3');
    stores.rgRow.addTrimmed({ filter: {}, grouping: {} });
    expect(grid.getAttribute('aria-rowcount')).toBe('5');
    stores.rowPinStart.updateData([{}, {}]);
    expect(grid.getAttribute('aria-rowcount')).toBe('6');
    plugin.destroy();
    stores.rgRow.addTrimmed({ filter: { 0: true } });
    expect(grid.getAttribute('aria-rowcount')).toBe('6');
  });
});
