import ViewportService from '../src/components/revoGrid/viewport.service';
import ViewportProvider from '../src/services/viewport.provider';
import DimensionProvider from '../src/services/dimension.provider';
import ColumnDataProvider from '../src/services/column.data.provider';
import { DataProvider } from '../src/services/data.provider';
import { SelectionStoreConnector } from '../src/services/selection.store.connector';
import GridScrollingService from '../src/components/revoGrid/viewport.scrolling.service';
import { OrdererService } from '../src/components/order/order-renderer';
import type { DimensionCols, ViewPortResizeEvent } from '../src/types';

function setup(type: DimensionCols = 'rgCol', options = {}) {
  const viewport = new ViewportProvider();
  const dimension = new DimensionProvider(viewport, { realSizeChanged: jest.fn() });
  const column = new ColumnDataProvider();
  column.stores[type].store.set('source', [{ prop: 'id' }]);
  column.stores[type].store.set('items', [0]);
  const service = new ViewportService({
    columnProvider: column, dataProvider: new DataProvider(dimension),
    dimensionProvider: dimension, viewportProvider: viewport,
    selectionStoreConnector: new SelectionStoreConnector(),
    scrollingService: new GridScrollingService(jest.fn()),
    orderService: new OrdererService(), resize: jest.fn(), ...options,
  }, 300);
  const resize = (dimension: ViewPortResizeEvent['dimension'], size: number) =>
    service.columns[0].prop.onResizeviewport!(new CustomEvent('resizeviewport', { detail: { dimension, size } }));
  return { viewport, resize };
}

describe('viewport resize synchronization', () => {
  it.each(['rgRow', 'rgCol'] as const)('retains the %s window across changed and repeated resize', type => {
    const { viewport, resize } = setup();
    const items = [{ itemIndex: 10, start: 300, end: 330, size: 30 }];
    viewport.setViewport(type, { virtualSize: 300, clientSize: 300, items, start: 0, end: 0 });
    resize(type, 400);
    expect(viewport.stores[type].store.get('virtualSize')).toBe(400);
    expect(viewport.stores[type].store.get('items')).toBe(items);
    resize(type, 400);
    expect(viewport.stores[type].store.get('items')).toBe(items);
  });

  it('routes pinned column resize to its own opted-in viewport', () => {
    const { viewport, resize } = setup('colPinEnd', { virtualX: ['rgCol', 'colPinEnd'] });
    const items = [{ itemIndex: 2, start: 60, end: 90, size: 30 }];
    viewport.setViewport('colPinEnd', { virtualSize: 100, items });
    resize('rgCol', 200);
    expect(viewport.stores.colPinEnd.store.get('virtualSize')).toBe(200);
    expect(viewport.stores.colPinEnd.store.get('items')).toBe(items);
    expect(viewport.stores.rgCol.store.get('virtualSize')).toBe(0);
  });

  it.each(['rgRow', 'rgCol'] as const)('only updates client size for nonvirtual %s', type => {
    const { viewport, resize } = setup('rgCol', { disableVirtualX: true, disableVirtualY: true });
    viewport.setViewport(type, { virtualSize: 100 });
    resize(type, 200);
    expect(viewport.stores[type].store.get('virtualSize')).toBe(100);
    expect(viewport.stores[type].store.get('clientSize')).toBe(200);
  });
});
