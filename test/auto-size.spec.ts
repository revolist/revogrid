import { AutoSizeColumnPlugin, ColumnAutoSizeMode } from '../src/plugins/column.auto-size.plugin';

describe('auto-size falsy cell values', () => {
  function createPlugin(preciseSize = false) {
    const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
    const setCustomSizes = jest.fn();
    const plugin = new AutoSizeColumnPlugin(grid, {
      dimension: { setCustomSizes },
    } as never, { preciseSize, mode: ColumnAutoSizeMode.autoSizeOnTextOverlap });
    return { grid, plugin, setCustomSizes };
  }

  it.each([null, undefined, ''])('keeps blank value %s at zero width', value => {
    const { plugin } = createPlugin();
    expect(plugin.getLength(value)).toBe(0);
    plugin.destroy();
  });

  it('measures zero and false using the same text rule as nonempty strings', () => {
    const { plugin } = createPlugin();
    expect(plugin.getLength(0)).toBe(plugin.getLength('0'));
    expect(plugin.getLength(false)).toBe(plugin.getLength('false'));
    expect(plugin.getLength(0)).toBe(37);
    expect(plugin.getLength(false)).toBe(65);
    plugin.destroy();
  });

  it('uses the precise measurement element for zero and false', () => {
    const { plugin } = createPlugin(true);
    Object.defineProperty(plugin.precsizeCalculationArea, 'scrollWidth', { value: 12 });
    expect(plugin.getLength(0)).toBe(42);
    expect(plugin.precsizeCalculationArea.innerText).toBe('0');
    expect(plugin.getLength(false)).toBe(42);
    expect(plugin.precsizeCalculationArea.innerText).toBe('false');
    plugin.destroy();
  });

  it('resizes through source and edit events for zero and false', () => {
    const { grid, plugin, setCustomSizes } = createPlugin();
    grid.dispatchEvent(new CustomEvent('beforecolumnsset', { detail: { columns: {
      rgCol: [{ prop: 'value', autoSize: true }], colPinStart: [], colPinEnd: [],
    } } }));
    grid.dispatchEvent(new CustomEvent('aftersourceset', {
      detail: { type: 'rgRow', source: [{ value: 0 }] },
    }));
    expect(setCustomSizes).toHaveBeenLastCalledWith('rgCol', { 0: 37 }, true);
    grid.dispatchEvent(new CustomEvent('afteredit', { detail: { prop: 'value', val: false } }));
    expect(setCustomSizes).toHaveBeenLastCalledWith('rgCol', { 0: 65 }, true);
    plugin.destroy();
  });
});
