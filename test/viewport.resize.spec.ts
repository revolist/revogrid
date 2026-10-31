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
  return { viewport, dimension, resize };
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

  it.each(['rgRow', 'rgCol'] as const)('rebuilds %s coverage on shrink without publishing an empty window', type => {
    const { viewport, dimension, resize } = setup();
    dimension.stores[type].setStore({ originItemSize: 30, count: 100 });
    viewport.setViewport(type, { virtualSize: 400, clientSize: 400, realCount: 100 });
    dimension.setViewPortCoordinate({ type, coordinate: 300, force: true });
    const store = viewport.stores[type].store;
    const before = store.get('items');
    const publications: number[] = [];
    const unsubscribe = store.onChange('items', items => publications.push(items.length));
    resize(type, 150);
    expect(store.get('items').length).toBeGreaterThan(0);
    expect(store.get('items').length).toBeLessThan(before.length);
    expect(store.get('items')[0].itemIndex).toBe(before[0].itemIndex);
    expect(publications).not.toContain(0);
    unsubscribe();
  });

  it.each(['colPinStart', 'colPinEnd'] as const)('fills newly visible %s columns without a follow-up scroll event', type => {
    const { viewport, dimension, resize } = setup(type, { virtualX: ['rgCol', type] });
    dimension.stores[type].setStore({ originItemSize: 80, count: 30 });
    viewport.setViewport(type, { virtualSize: 100, clientSize: 100, realCount: 30 });
    dimension.setViewPortCoordinate({ type, coordinate: 80, force: true });
    const store = viewport.stores[type].store;
    const before = store.get('items');
    const publications: number[] = [];
    const unsubscribe = store.onChange('items', items => publications.push(items.length));
    resize('rgCol', 400);
    expect(store.get('virtualSize')).toBe(400);
    expect(store.get('items').length).toBeGreaterThan(before.length);
    expect(Math.max(...store.get('items').map(item => item.end))).toBeGreaterThanOrEqual(480);
    expect(store.get('items')[0].itemIndex).toBe(before[0].itemIndex);
    expect(publications).not.toContain(0);
    expect(viewport.stores.rgCol.store.get('virtualSize')).toBe(0);
    unsubscribe();
  });

  it('routes pinned column resize to its own opted-in viewport', () => {
    const { viewport, dimension, resize } = setup('colPinEnd', { virtualX: ['rgCol', 'colPinEnd'] });
    dimension.stores.colPinEnd.setStore({ originItemSize: 500, count: 1 });
    const items = [{ itemIndex: 0, start: 0, end: 500, size: 500 }];
    viewport.setViewport('colPinEnd', { virtualSize: 100, realCount: 1, items });
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
