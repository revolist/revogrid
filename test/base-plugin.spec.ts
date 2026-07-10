import { BasePlugin } from '../src/plugins/base.plugin';

describe('BasePlugin', () => {
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
