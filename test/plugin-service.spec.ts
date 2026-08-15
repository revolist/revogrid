import { PluginService } from '../src/components/revoGrid/plugin.service';
import { BasePlugin } from '../src/plugins/base.plugin';

class TrackedPlugin extends BasePlugin {
  static created = 0;
  static destroyed = 0;

  constructor(grid: HTMLRevoGridElement, providers: never) {
    super(grid, providers);
    TrackedPlugin.created++;
  }

  destroy() {
    TrackedPlugin.destroyed++;
    super.destroy();
  }
}

class SecondPlugin extends BasePlugin {}
class ThirdPlugin extends BasePlugin {}

describe('PluginService plugin ownership', () => {
  let service: PluginService;
  let grid: HTMLRevoGridElement;

  beforeEach(() => {
    service = new PluginService();
    grid = document.createElement('revo-grid') as HTMLRevoGridElement;
    TrackedPlugin.created = 0;
    TrackedPlugin.destroyed = 0;
  });

  it('creates each requested constructor once and keeps unchanged instances', () => {
    service.syncPlugins(
      grid,
      [TrackedPlugin, TrackedPlugin, SecondPlugin],
      {} as never,
    );
    const instances = service.get();

    service.syncPlugins(grid, [TrackedPlugin, SecondPlugin], {} as never);

    expect(service.get()).toEqual(instances);
    expect(TrackedPlugin.created).toBe(1);
    expect(TrackedPlugin.destroyed).toBe(0);
  });

  it('keeps existing instances stable when the requested set is reordered', () => {
    service.syncPlugins(grid, [TrackedPlugin, SecondPlugin], {} as never);
    const instances = service.get();
    const secondDestroy = jest.spyOn(instances[1], 'destroy');

    service.syncPlugins(grid, [SecondPlugin, TrackedPlugin], {} as never);

    expect(service.get()).toEqual(instances);
    expect(TrackedPlugin.created).toBe(1);
    expect(TrackedPlugin.destroyed).toBe(0);
    expect(secondDestroy).not.toHaveBeenCalled();
  });

  it('releases only constructors missing from the next requested set', () => {
    service.syncPlugins(
      grid,
      [TrackedPlugin, SecondPlugin, ThirdPlugin],
      {} as never,
    );
    const [, second, third] = service.get();
    const secondDestroy = jest.spyOn(second, 'destroy');
    const thirdDestroy = jest.spyOn(third, 'destroy');

    service.syncPlugins(grid, [SecondPlugin, ThirdPlugin], {} as never);

    expect(service.get()).toEqual([second, third]);
    expect(TrackedPlugin.destroyed).toBe(1);
    expect(secondDestroy).not.toHaveBeenCalled();
    expect(thirdDestroy).not.toHaveBeenCalled();
  });

  it('destroys a synchronized plugin only after it is no longer requested', () => {
    service.syncPlugins(grid, [TrackedPlugin], {} as never);
    service.syncPlugins(grid, [TrackedPlugin], {} as never);
    service.syncPlugins(grid, [], {} as never);

    expect(service.get()).toEqual([]);
    expect(TrackedPlugin.created).toBe(1);
    expect(TrackedPlugin.destroyed).toBe(1);
  });

  it('preserves distinct persistent structural plugins sharing a constructor', () => {
    const first = { destroy: jest.fn() };
    const second = { destroy: jest.fn() };

    service.add(first);
    service.add(second);

    expect(service.get()).toEqual([first, second]);
    expect(first.destroy).not.toHaveBeenCalled();
    expect(second.destroy).not.toHaveBeenCalled();

    service.remove(first);
    expect(service.get()).toEqual([second]);
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).not.toHaveBeenCalled();

    service.destroy();
    expect(second.destroy).toHaveBeenCalledTimes(1);
  });

  it('can promote a synchronized instance to persistent ownership', () => {
    service.syncPlugins(grid, [TrackedPlugin], {} as never);
    const plugin = service.get()[0];

    service.add(plugin);
    service.syncPlugins(grid, [], {} as never);

    expect(service.get()).toEqual([plugin]);
    expect(TrackedPlugin.destroyed).toBe(0);
  });

  it('does not take ownership of or remove an existing core plugin', () => {
    const corePlugin = new TrackedPlugin(grid, {} as never);
    service.add(corePlugin);

    service.syncPlugins(grid, [TrackedPlugin], {} as never);
    service.syncPlugins(grid, [], {} as never);

    expect(service.get()).toEqual([corePlugin]);
    expect(TrackedPlugin.created).toBe(1);
    expect(TrackedPlugin.destroyed).toBe(0);
  });

  it('destroys all managed and core plugins once on teardown', () => {
    const corePlugin = new SecondPlugin(grid, {} as never);
    const coreDestroy = jest.spyOn(corePlugin, 'destroy');
    service.add(corePlugin);
    service.syncPlugins(grid, [TrackedPlugin], {} as never);

    service.destroy();

    expect(service.get()).toEqual([]);
    expect(coreDestroy).toHaveBeenCalledTimes(1);
    expect(TrackedPlugin.destroyed).toBe(1);
  });
});
