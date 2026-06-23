import LocalScrollService from '../src/services/local.scroll.service';
import { LocalScrollTimer } from '../src/services/local.scroll.timer';
import { getScrollDimension } from '../src/services/scroll.dimension.helpers';
import DimensionProvider from '../src/services/dimension.provider';
import ViewportProvider from '../src/services/viewport.provider';

function createScrollDetectionDocument(scrollHeight: number): Document {
  const element = {
    appendChild: jest.fn(),
    remove: jest.fn(),
    scrollHeight,
    style: {},
  };
  const content = {
    appendChild: jest.fn(),
    remove: jest.fn(),
    scrollHeight: 0,
    style: {},
  };
  const body = {
    appendChild: jest.fn(),
    ownerDocument: undefined as unknown,
  };
  const doc = {
    body,
    createElement: jest
      .fn()
      .mockReturnValueOnce(element)
      .mockReturnValueOnce(content),
  };
  body.ownerDocument = doc;
  return doc as unknown as Document;
}

describe('browser-limit-aware scroll dimensions', () => {
  it('uses 1:1 coordinates while content fits the physical scroll range', () => {
    const dimension = getScrollDimension({
      contentSize: 1_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_010_000,
    });

    expect(dimension.isCompressed).toBe(false);
    expect(dimension.physicalContentSize).toBe(1_000);
    expect(dimension.toLogicalCoordinate(450)).toBe(450);
    expect(dimension.toPhysicalCoordinate(450)).toBe(450);
    expect(dimension.getRenderOffset(450)).toBe(0);
  });

  it('maps normal scroll coordinates at start, middle, and end without compression', () => {
    const dimension = getScrollDimension({
      contentSize: 1_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_010_000,
    });

    expect(dimension.toLogicalCoordinate(0)).toBe(0);
    expect(dimension.toPhysicalCoordinate(0)).toBe(0);
    expect(dimension.toLogicalCoordinate(450)).toBe(450);
    expect(dimension.toPhysicalCoordinate(450)).toBe(450);
    expect(dimension.toLogicalCoordinate(900)).toBe(900);
    expect(dimension.toPhysicalCoordinate(900)).toBe(900);
  });

  it('maps compressed physical scroll coordinates to the full logical range', () => {
    const dimension = getScrollDimension({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    });

    expect(dimension.isCompressed).toBe(true);
    expect(dimension.physicalContentSize).toBe(1_000);
    expect(dimension.physicalScrollSize).toBe(900);
    expect(dimension.logicalScrollSize).toBe(99_900);
    expect(dimension.toLogicalCoordinate(900)).toBe(99_900);
    expect(dimension.toPhysicalCoordinate(99_900)).toBe(900);
    expect(dimension.getRenderOffset(99_900)).toBe(99_000);
  });

  it('maps compressed scroll coordinates at start, middle, and end', () => {
    const dimension = getScrollDimension({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    });

    expect(dimension.toLogicalCoordinate(0)).toBe(0);
    expect(dimension.toPhysicalCoordinate(0)).toBe(0);
    expect(dimension.toLogicalCoordinate(450)).toBe(49_950);
    expect(dimension.toPhysicalCoordinate(49_950)).toBe(450);
    expect(dimension.toLogicalCoordinate(900)).toBe(99_900);
    expect(dimension.toPhysicalCoordinate(99_900)).toBe(900);
  });

  it('clamps logical and physical coordinates to their scroll ranges', () => {
    const dimension = getScrollDimension({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    });

    expect(dimension.toLogicalCoordinate(-100)).toBe(0);
    expect(dimension.toPhysicalCoordinate(-100)).toBe(0);
    expect(dimension.toLogicalCoordinate(10_000)).toBe(99_900);
    expect(dimension.toPhysicalCoordinate(1_000_000)).toBe(900);
    expect(dimension.getRenderOffset(-100)).toBe(0);
    expect(dimension.getRenderOffset(1_000_000)).toBe(99_000);
  });

  it('does not cache fallback scroll size before document body exists', () => {
    jest.isolateModules(() => {
      const helpers = require('../src/services/scroll.dimension.helpers') as typeof import('../src/services/scroll.dimension.helpers');
      const bodylessDocument = {} as Document;

      expect(helpers.getMaxScrollSize(bodylessDocument)).toBe(16_000_000);
      expect(
        helpers.getMaxScrollSize(createScrollDetectionDocument(32_000_000)),
      ).toBe(31_000_000);
    });
  });

  it('keeps render offset equal to logical coordinate minus mapped physical coordinate', () => {
    const dimension = getScrollDimension({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    });
    const logicalCoordinate = 75_000;

    expect(dimension.getRenderOffset(logicalCoordinate)).toBe(
      logicalCoordinate - dimension.toPhysicalCoordinate(logicalCoordinate),
    );
  });

  it('keeps wheel deltas in logical pixels when scroll space is compressed', () => {
    const events: any[] = [];
    const service = new LocalScrollService({
      runScroll: e => events.push(e),
      applyScroll: () => undefined,
    });
    service.setParams({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    }, 'rgRow');

    service.scroll(10, 'rgRow', false, 10);

    expect(events).toHaveLength(1);
    expect(events[0].coordinate).toBe(10);
  });

  it('does not emit a feedback scroll after applying a logical coordinate', async () => {
    const events: any[] = [];
    const service = new LocalScrollService({
      skipAnimationFrame: true,
      runScroll: e => events.push(e),
      applyScroll: () => undefined,
    });
    service.setParams({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    }, 'rgRow');

    await service.setScroll({
      dimension: 'rgRow',
      coordinate: 99_900,
    });
    service.scroll(900, 'rgRow');

    expect(events).toHaveLength(0);
  });

  it('allows rapid return to a coordinate after an intermediate native scroll was accepted', () => {
    jest.useFakeTimers().setSystemTime(1_000);
    try {
      const timer = new LocalScrollTimer(10);

      timer.latestScrollUpdate('rgCol');
      timer.setCoordinate({ dimension: 'rgCol', coordinate: 0 });

      jest.setSystemTime(1_020);
      expect(timer.isReady('rgCol', 520)).toBe(true);
      timer.setCoordinateFromScroll({ dimension: 'rgCol', coordinate: 520 });

      jest.setSystemTime(1_020);
      expect(timer.isReady('rgCol', 0)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps delta-based setScroll updates in logical pixels under compression', async () => {
    const applied: any[] = [];
    const service = new LocalScrollService({
      skipAnimationFrame: true,
      runScroll: () => undefined,
      applyScroll: e => applied.push(e),
    });
    service.setParams({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    }, 'rgRow');

    const nextEvent = await service.setScrollByDelta(
      {
        dimension: 'rgRow',
        coordinate: 0,
        delta: 10,
      },
      450,
    );

    expect(nextEvent.coordinate).toBe(49_960);
    expect(applied).toHaveLength(1);
    expect(applied[0].coordinate).toBeGreaterThan(450);
    expect(applied[0].coordinate).toBeLessThan(451);
  });

  it('applies logical scroll coordinates back to physical scrollbar positions', async () => {
    const applied: any[] = [];
    const requestAnimationFrame = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    const cancelAnimationFrame = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    const service = new LocalScrollService({
      runScroll: () => undefined,
      applyScroll: e => applied.push(e),
    });
    service.setParams({
      contentSize: 100_000,
      clientSize: 100,
      virtualSize: 100,
      maxScrollSize: 1_001_000,
    }, 'rgRow');

    await service.setScroll({
      dimension: 'rgRow',
      coordinate: 99_900,
    });

    expect(applied).toHaveLength(1);
    expect(applied[0].coordinate).toBe(900);

    requestAnimationFrame.mockRestore();
    cancelAnimationFrame.mockRestore();
  });

  it('stores render offset for large logical viewport coordinates', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const rowDimension = dimensions.stores.rgRow;
    rowDimension.setStore({
      count: 2_000_000,
      originItemSize: 30,
      realSize: 60_000_000,
    });
    viewports.stores.rgRow.setViewport({
      clientSize: 600,
      virtualSize: 600,
      realCount: 2_000_000,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: 30_000_000,
    });

    const renderOffset = viewports.stores.rgRow.store.get('renderOffset');
    expect(renderOffset).toBeGreaterThan(0);
    expect(rowDimension.store.get('renderOffset')).toBe(renderOffset);
  });

  it('uses the actual logical bottom coordinate for compressed render offset', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const rowDimension = dimensions.stores.rgRow;
    rowDimension.setStore({
      count: 2_000_000,
      originItemSize: 30,
      realSize: 60_000_000,
    });
    viewports.stores.rgRow.setViewport({
      clientSize: 600,
      virtualSize: 600,
      realCount: 2_000_000,
    });
    const scrollDimension = getScrollDimension({
      contentSize: 60_000_000,
      clientSize: 600,
      virtualSize: 600,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: scrollDimension.logicalScrollSize,
    });

    const renderOffset = viewports.stores.rgRow.store.get('renderOffset');
    expect(renderOffset).toBe(
      scrollDimension.getRenderOffset(scrollDimension.logicalScrollSize),
    );
    expect(rowDimension.store.get('renderOffset')).toBe(renderOffset);
  });

  it('uses the actual logical bottom coordinate with a custom-sized tail row', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const rowDimension = dimensions.stores.rgRow;
    const rowCount = 2_000_000;
    const lastRow = rowCount - 1;
    rowDimension.setStore({
      count: rowCount,
      originItemSize: 30,
    });
    rowDimension.setDimensionSize({
      [lastRow]: 80,
    });
    viewports.stores.rgRow.setViewport({
      clientSize: 600,
      virtualSize: 600,
      realCount: rowCount,
    });
    const scrollDimension = getScrollDimension({
      contentSize: rowDimension.store.get('realSize'),
      clientSize: 600,
      virtualSize: 600,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: scrollDimension.logicalScrollSize,
    });

    const renderOffset = viewports.stores.rgRow.store.get('renderOffset');
    expect(rowDimension.store.get('realSize')).toBe(60_000_050);
    expect(renderOffset).toBe(
      scrollDimension.getRenderOffset(scrollDimension.logicalScrollSize),
    );
    expect(rowDimension.store.get('renderOffset')).toBe(renderOffset);
  });

  it('uses the actual logical right edge coordinate for compressed column render offset', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const colDimension = dimensions.stores.rgCol;
    colDimension.setStore({
      count: 120_000,
      originItemSize: 300,
      realSize: 36_000_000,
    });
    viewports.stores.rgCol.setViewport({
      clientSize: 780,
      virtualSize: 780,
      realCount: 120_000,
    });
    const scrollDimension = getScrollDimension({
      contentSize: 36_000_000,
      clientSize: 780,
      virtualSize: 780,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgCol',
      coordinate: scrollDimension.logicalScrollSize,
    });

    const renderOffset = viewports.stores.rgCol.store.get('renderOffset');
    expect(renderOffset).toBe(
      scrollDimension.getRenderOffset(scrollDimension.logicalScrollSize),
    );
    expect(colDimension.store.get('renderOffset')).toBe(renderOffset);
  });

  it('recomputes render offset when viewport size changes', () => {
    const firstRenderOffset = getScrollDimension({
      contentSize: 60_000_000,
      clientSize: 600,
      virtualSize: 600,
      maxScrollSize: 16_000_000,
    }).getRenderOffset(30_000_000);
    const resizedRenderOffset = getScrollDimension({
      contentSize: 60_000_000,
      clientSize: 1_200,
      virtualSize: 1_200,
      maxScrollSize: 16_000_000,
    }).getRenderOffset(30_000_000);

    expect(resizedRenderOffset).toBeGreaterThan(0);
    expect(resizedRenderOffset).not.toBe(firstRenderOffset);
  });

  it('stores recomputed render offset in viewport and dimension stores', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const rowDimension = dimensions.stores.rgRow;
    rowDimension.setStore({
      count: 2_000_000,
      originItemSize: 30,
      realSize: 60_000_000,
    });
    viewports.stores.rgRow.setViewport({
      clientSize: 600,
      virtualSize: 600,
      realCount: 2_000_000,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: 30_000_000,
    });
    const firstRenderOffset = viewports.stores.rgRow.store.get('renderOffset');

    viewports.stores.rgRow.setViewport({
      clientSize: 1_200,
      virtualSize: 1_200,
    });
    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: 30_000_000,
    });
    const resizedRenderOffset = viewports.stores.rgRow.store.get('renderOffset');

    expect(firstRenderOffset).toBeGreaterThan(0);
    expect(resizedRenderOffset).toBeGreaterThan(0);
    expect(rowDimension.store.get('renderOffset')).toBe(resizedRenderOffset);
  });

  it('keeps render offset at zero until viewport sizes are initialized', () => {
    const viewports = new ViewportProvider();
    const dimensions = new DimensionProvider(viewports, {
      realSizeChanged: () => undefined,
    });
    const rowDimension = dimensions.stores.rgRow;
    rowDimension.setStore({
      count: 2_000_000,
      originItemSize: 30,
      realSize: 60_000_000,
    });

    dimensions.setViewPortCoordinate({
      type: 'rgRow',
      coordinate: 30_000_000,
    });

    expect(viewports.stores.rgRow.store.get('renderOffset')).toBe(0);
    expect(rowDimension.store.get('renderOffset')).toBe(0);
  });
});
