import { AutoSizeColumnPlugin } from '../src/plugins/column.auto-size.plugin';
import type { ColumnRegular, DimensionCols } from '../src';

describe('auto-size column replacement', () => {
  function createPlugin() {
    const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
    const setCustomSizes = jest.fn();
    const plugin = new AutoSizeColumnPlugin(grid, {
      dimension: { setCustomSizes },
    } as never);
    return { grid, plugin, setCustomSizes };
  }
  function columns(main: ColumnRegular[], start: ColumnRegular[] = []): Record<DimensionCols, ColumnRegular[]> {
    return { rgCol: main, colPinStart: start, colPinEnd: [] };
  }

  it('drops removed columns and pin groups on the next columns event', () => {
    const { grid, plugin } = createPlugin();
    grid.dispatchEvent(new CustomEvent('beforecolumnsset', { detail: { columns: columns(
      [{ prop: 'first', autoSize: true }, { prop: 'removed', autoSize: true }],
      [{ prop: 'pinned', autoSize: true }],
    ) } }));
    grid.dispatchEvent(new CustomEvent('beforecolumnsset', { detail: { columns: columns(
      [{ prop: 'replacement', autoSize: true }],
    ) } }));
    expect(Object.keys(plugin.autoSizeColumns!)).toEqual(['rgCol']);
    expect(Object.keys(plugin.autoSizeColumns!.rgCol!)).toEqual(['0']);
    expect(plugin.autoSizeColumns!.rgCol![0].prop).toBe('replacement');
    plugin.destroy();
  });

  it('clears disabled columns without applying sizes for later edits', () => {
    const { plugin, setCustomSizes } = createPlugin();
    plugin.columnSet(columns([{ prop: 'value', autoSize: true }]));
    plugin.columnSet(columns([{ prop: 'value', autoSize: false }]));
    expect(plugin.autoSizeColumns).toBeNull();
    plugin.afteredit({ prop: 'value', val: 'Longer value' } as never);
    expect(setCustomSizes).not.toHaveBeenCalled();
    plugin.destroy();
  });

  it('settles a pending source request with an empty column set', async () => {
    const { plugin, setCustomSizes } = createPlugin();
    const pending = plugin.setSource([{ value: 'Pending' }]);
    expect(plugin.dataResolve).not.toBeNull();
    plugin.columnSet(columns([]));
    await pending;
    expect(plugin.autoSizeColumns).toBeNull();
    expect(plugin.dataResolve).toBeNull();
    expect(plugin.dataReject).toBeNull();
    expect(setCustomSizes).not.toHaveBeenCalled();
    plugin.destroy();
  });

  it('does not wait for another column set after an empty set is known', async () => {
    const { plugin, setCustomSizes } = createPlugin();
    plugin.columnSet(columns([]));
    const pending = plugin.setSource([{ value: 'Pending' }]);
    expect(plugin.dataResolve).toBeNull();
    plugin.columnSet(columns([]));
    await pending;
    expect(plugin.dataResolve).toBeNull();
    expect(plugin.dataReject).toBeNull();
    expect(setCustomSizes).not.toHaveBeenCalled();
    plugin.destroy();
  });
});
