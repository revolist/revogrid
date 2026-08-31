import {
  clampRowResizeHeight,
  createRowResizePatch,
  DEFAULT_MIN_ROW_HEIGHT,
  getRowResizeIndexes,
  mergeRowResizeDefinitions,
  RowResizePlugin,
  resolveRowResizeConfig,
} from '../src/plugins/row-resize';
import type { PluginProviders } from '../src/types';

describe('row resize utilities', () => {
  it('subscribes from supplied config without reading grid properties', () => {
    const grid = {
      get resizeRow(): never {
        throw new Error('resizeRow must be supplied by the component');
      },
      get plugins(): never {
        throw new Error('plugins must be supplied by the component');
      },
      get rowDefinitions(): never {
        throw new Error('rowDefinitions must be read from the provider');
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      refresh: jest.fn(),
    } as unknown as HTMLRevoGridElement;
    const plugin = RowResizePlugin.fromGridConfig(
      grid,
      {} as PluginProviders,
      {
        resizeRow: false,
        hasConfiguredPlugin: false,
        explicitlyEnabled: false,
      },
    );

    expect(grid.addEventListener).not.toHaveBeenCalled();

    plugin.setGridConfig({
      resizeRow: true,
      hasConfiguredPlugin: false,
      explicitlyEnabled: false,
    });

    expect(grid.addEventListener).toHaveBeenCalled();
    const subscriptionCount = (grid.addEventListener as jest.Mock).mock.calls
      .length;

    plugin.setGridConfig({
      resizeRow: true,
      hasConfiguredPlugin: true,
      explicitlyEnabled: false,
    });
    expect(grid.removeEventListener).toHaveBeenCalled();

    plugin.setGridConfig({
      resizeRow: false,
      hasConfiguredPlugin: false,
      explicitlyEnabled: true,
    });
    expect((grid.addEventListener as jest.Mock).mock.calls.length).toBeGreaterThan(
      subscriptionCount,
    );
    plugin.destroy();
  });

  it('normalizes minimum and maximum heights', () => {
    expect(resolveRowResizeConfig()).toEqual({
      minHeight: DEFAULT_MIN_ROW_HEIGHT,
      maxHeight: undefined,
      fullRow: false,
    });
    expect(
      resolveRowResizeConfig({
        minHeight: 0,
        maxHeight: 5.6,
        fullRow: true,
      }),
    ).toEqual({ minHeight: 1, maxHeight: 6, fullRow: true });
    expect(resolveRowResizeConfig({ minHeight: 30, maxHeight: 10 })).toEqual({
      minHeight: 30,
      maxHeight: 30,
      fullRow: false,
    });
    expect(
      resolveRowResizeConfig({ minHeight: Number.NaN, maxHeight: Infinity }),
    ).toEqual({
      minHeight: DEFAULT_MIN_ROW_HEIGHT,
      maxHeight: undefined,
      fullRow: false,
    });
  });

  it('rounds and clamps live pointer heights', () => {
    const config = resolveRowResizeConfig({ minHeight: 20, maxHeight: 80 });
    expect(clampRowResizeHeight(51.6, config)).toBe(52);
    expect(clampRowResizeHeight(-100, config)).toBe(20);
    expect(clampRowResizeHeight(100, config)).toBe(80);
    expect(clampRowResizeHeight(Number.NaN, config)).toBe(20);
  });

  it('targets the grabbed row when it is outside the active range', () => {
    expect(
      getRowResizeIndexes({
        rowType: 'rgRow',
        rowIndex: 7,
        rowCount: 10,
        selectedRange: { x: 0, x1: 2, y: 2, y1: 4 },
        selectedRowType: 'rgRow',
      }),
    ).toEqual([7]);
  });

  it('targets an inclusive selected range in the same row dimension', () => {
    expect(
      getRowResizeIndexes({
        rowType: 'rgRow',
        rowIndex: 3,
        rowCount: 10,
        selectedRange: { x: 0, x1: 2, y: 4, y1: 2 },
        selectedRowType: 'rgRow',
      }),
    ).toEqual([2, 3, 4]);
  });

  it('isolates selections in another pinned row dimension and clamps bounds', () => {
    expect(
      getRowResizeIndexes({
        rowType: 'rowPinStart',
        rowIndex: 1,
        rowCount: 3,
        selectedRange: { x: 0, x1: 2, y: -2, y1: 10 },
        selectedRowType: 'rgRow',
      }),
    ).toEqual([1]);
    expect(
      getRowResizeIndexes({
        rowType: 'rgRow',
        rowIndex: 1,
        rowCount: 3,
        selectedRange: { x: 0, x1: 2, y: -2, y1: 10 },
        selectedRowType: 'rgRow',
      }),
    ).toEqual([0, 1, 2]);
  });

  it('builds one absolute height patch for all selected rows', () => {
    expect(createRowResizePatch([2, 3, 4], 57)).toEqual({
      2: 57,
      3: 57,
      4: 57,
    });
  });

  it('merges physical row sizes without replacing existing definitions', () => {
    const definitions = [
      { type: 'rgRow' as const, index: 1, size: 40 },
      { type: 'rgRow' as const, index: 3, size: 72 },
      { type: 'rowPinStart' as const, index: 0, size: 48 },
    ];

    expect(
      mergeRowResizeDefinitions(definitions, 'rgRow', [1, 2], 60),
    ).toEqual([
      { type: 'rgRow', index: 1, size: 60 },
      { type: 'rgRow', index: 3, size: 72 },
      { type: 'rowPinStart', index: 0, size: 48 },
      { type: 'rgRow', index: 2, size: 60 },
    ]);
    expect(definitions[0].size).toBe(40);
  });
});
