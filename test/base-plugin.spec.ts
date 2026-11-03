import { BasePlugin } from '../src/plugins/base.plugin';

describe('BasePlugin', () => {
  it('removes every callback for an event without removing other subscriptions', () => {
    const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
    const plugin = new BasePlugin(grid, {} as never);
    const otherPlugin = new BasePlugin(grid, {} as never);
    const first = jest.fn();
    const second = jest.fn();
    const other = jest.fn();
    const differentEvent = jest.fn();
    plugin.addEventListener('beforeheaderclick', first);
    plugin.addEventListener('beforeheaderclick', second);
    plugin.addEventListener('afteredit', differentEvent);
    otherPlugin.addEventListener('beforeheaderclick', other);

    grid.dispatchEvent(new CustomEvent('beforeheaderclick'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(plugin.subscriptions.beforeheaderclick).toBe(second);

    plugin.removeEventListener('beforeheaderclick');
    grid.dispatchEvent(new CustomEvent('beforeheaderclick'));
    grid.dispatchEvent(new CustomEvent('afteredit'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(2);
    expect(differentEvent).toHaveBeenCalledTimes(1);
    expect(plugin.subscriptions.beforeheaderclick).toBeUndefined();

    otherPlugin.destroy();
    plugin.destroy();
  });

  it('destroys repeated subscriptions and supports registering again after clearing', () => {
    const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
    const plugin = new BasePlugin(grid, {} as never);
    const first = jest.fn();
    const second = jest.fn();
    plugin.addEventListener('beforeheaderclick', first);
    plugin.addEventListener('beforeheaderclick', second);
    plugin.destroy();
    plugin.destroy();
    grid.dispatchEvent(new CustomEvent('beforeheaderclick'));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(plugin.subscriptions).toEqual({});

    plugin.addEventListener('beforeheaderclick', first);
    grid.dispatchEvent(new CustomEvent('beforeheaderclick'));
    expect(first).toHaveBeenCalledTimes(1);
    plugin.clearSubscriptions();
    grid.dispatchEvent(new CustomEvent('beforeheaderclick'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(plugin.subscriptions).toEqual({});
  });

  it('provides the current accessor value to immediate watchers', () => {
    let value = true;
    const revogrid = {
      get rtl() {
        return value;
      },
      set rtl(next: boolean) {
        value = next;
      },
    } as HTMLRevoGridElement;
    const values: boolean[] = [];
    const plugin = new BasePlugin(revogrid, {} as never);

    plugin.watch<boolean>('rtl', next => values.push(next), {
      immediate: true,
    });
    revogrid.rtl = false;

    expect(values).toEqual([true, false]);
    expect(revogrid.rtl).toBe(false);
  });
});
