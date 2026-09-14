import { KeyboardService } from '../src/components/overlay/keyboard.service';
import { SelectionStoreConnector } from '../src/services/selection.store.connector';

function createService() {
  const ranges: unknown[] = [];
  const focuses: unknown[] = [];
  const selectionState = {
    range: { x: 3, y: 2, x1: 3, y1: 6 },
    focus: { x: 3, y: 2 },
  };
  const service = new KeyboardService({
    selectionStore: {
      get(key: keyof typeof selectionState) {
        return selectionState[key] ?? null;
      },
    } as any,
    change: () => false,
    cancel: () => undefined,
    clearCell: () => undefined,
    focus: (cell, changes) => {
      focuses.push({ cell, changes });
      return true;
    },
    getData: () => ({ lastCell: { x: 8, y: 20 } }),
    internalPaste: () => undefined,
    range: range => {
      ranges.push(range);
      return true;
    },
    rangeToEdge: range => {
      ranges.push(range);
      return true;
    },
    selectAll: () => undefined,
  });
  return { service, ranges, focuses, selectionState };
}

describe('KeyboardService grid-edge navigation', () => {
  it('uses an explicit edge direction for Ctrl and Cmd arrows', () => {
    const { service } = createService();

    expect(
      service.changeDirectionKey(
        new KeyboardEvent('keydown', {
          code: 'ArrowLeft',
          ctrlKey: true,
          cancelable: true,
        }),
        true,
      ),
    ).toMatchObject({
      edge: { coordinate: 'x', direction: -1 },
    });
    expect(
      service.changeDirectionKey(
        new KeyboardEvent('keydown', {
          code: 'ArrowDown',
          metaKey: true,
          cancelable: true,
        }),
        true,
      ),
    ).toMatchObject({
      edge: { coordinate: 'y', direction: 1 },
    });
  });

  it('does not consume primary-modifier browser shortcuts with Alt or Tab', () => {
    const { service } = createService();
    const altArrow = new KeyboardEvent('keydown', {
      code: 'ArrowLeft',
      ctrlKey: true,
      altKey: true,
      cancelable: true,
    });
    const controlTab = new KeyboardEvent('keydown', {
      code: 'Tab',
      ctrlKey: true,
      cancelable: true,
    });

    expect(service.changeDirectionKey(altArrow, true)).toBeUndefined();
    expect(service.changeDirectionKey(controlTab, true)).toBeUndefined();
    expect(altArrow.defaultPrevented).toBe(false);
    expect(controlTab.defaultPrevented).toBe(false);
  });

  it('preserves the orthogonal range axis when extending to another edge', () => {
    const { service, ranges, selectionState } = createService();

    (service as any).keyEdgeChange(
      { coordinate: 'x', direction: 1 },
      selectionState.range,
      selectionState.focus,
      true,
    );

    expect(ranges).toEqual([{ x: 3, y: 2, x1: 7, y1: 6 }]);
  });

  it('keeps focus valid while delegating an unbounded delta to the connector', () => {
    const { service, focuses, selectionState } = createService();

    (service as any).keyEdgeChange(
      { coordinate: 'y', direction: -1 },
      selectionState.range,
      selectionState.focus,
      false,
    );

    expect(focuses).toEqual([
      {
        cell: { x: 3, y: 2 },
        changes: { y: Number.NEGATIVE_INFINITY },
      },
    ]);
  });
});

describe('SelectionStoreConnector unbounded focus traversal', () => {
  it('crosses populated pinned columns and skips empty pinned rows', () => {
    const connector = new SelectionStoreConnector();
    connector.registerColumn(0, 'colPinStart');
    connector.registerColumn(1, 'rgCol');
    connector.registerColumn(2, 'colPinEnd');
    connector.registerRow(0, 'rowPinStart');
    connector.registerRow(1, 'rgRow');
    connector.registerRow(2, 'rowPinEnd');

    const stores = Array.from({ length: 3 }, (_, y) =>
      Array.from({ length: 3 }, (_, x) => connector.register({ x, y })),
    );
    stores.forEach((row, y) =>
      row.forEach((store, x) => {
        store.setLastCell({
          x: x === 1 ? 3 : 1,
          y: y === 1 ? 4 : 0,
        });
      }),
    );

    const body = stores[1][1];
    connector.focus(body, {
      focus: { x: 1, y: 2 },
      end: { x: 1, y: 2 },
      next: { x: Number.POSITIVE_INFINITY },
    });
    expect(connector.focusedStore).toMatchObject({
      cell: { x: 0, y: 2 },
      position: { x: 2, y: 1 },
    });

    connector.focus(connector.focusedStore!.entity, {
      focus: { x: 0, y: 2 },
      end: { x: 0, y: 2 },
      next: { x: Number.NEGATIVE_INFINITY },
    });
    expect(connector.focusedStore).toMatchObject({
      cell: { x: 0, y: 2 },
      position: { x: 0, y: 1 },
    });

    connector.focus(body, {
      focus: { x: 1, y: 2 },
      end: { x: 1, y: 2 },
      next: { y: Number.NEGATIVE_INFINITY },
    });
    expect(connector.focusedStore).toMatchObject({
      cell: { x: 1, y: 0 },
      position: { x: 1, y: 1 },
    });

    connector.focus(body, {
      focus: { x: 1, y: 2 },
      end: { x: 1, y: 2 },
      next: { y: Number.POSITIVE_INFINITY },
    });
    expect(connector.focusedStore).toMatchObject({
      cell: { x: 1, y: 3 },
      position: { x: 1, y: 1 },
    });
  });

  it('extends a range across both pinned axes without moving its anchor', () => {
    const connector = new SelectionStoreConnector();
    connector.registerColumn(0, 'colPinStart');
    connector.registerColumn(1, 'rgCol');
    connector.registerColumn(2, 'colPinEnd');
    connector.registerRow(0, 'rowPinStart');
    connector.registerRow(1, 'rgRow');
    connector.registerRow(2, 'rowPinEnd');
    const stores = Array.from({ length: 3 }, (_, y) =>
      Array.from({ length: 3 }, (_, x) => connector.register({ x, y })),
    );
    stores.forEach(row =>
      row.forEach((store, x) => {
        store.setLastCell({ x: x === 1 ? 3 : 1, y: 1 });
      }),
    );
    stores[1].forEach(store =>
      store.setLastCell({
        x: store === stores[1][1] ? 3 : 1,
        y: 4,
      }),
    );

    const body = stores[1][1];
    body.setFocus({ x: 1, y: 2 }, { x: 1, y: 2 });
    body.setRangeArea({ x: 1, y: 2, x1: 1, y1: 3 });
    expect(
      connector.setRangeToEdge(body, {
        coordinate: 'y',
        direction: 1,
      }),
    ).toBe(true);

    body.setRangeArea({ x: 1, y: 2, x1: 2, y1: 3 });
    expect(
      connector.setRangeToEdge(body, {
        coordinate: 'x',
        direction: 1,
      }),
    ).toBe(true);

    expect(body.store.get('focus')).toEqual({ x: 1, y: 2 });
    expect(stores[1][1].store.get('range')).toEqual({
      x: 1,
      y: 2,
      x1: 2,
      y1: 3,
    });
    expect(stores[1][2].store.get('range')).toEqual({
      x: 0,
      y: 2,
      x1: 0,
      y1: 3,
    });
    expect(stores[2][1].store.get('range')).toEqual({
      x: 1,
      y: 0,
      x1: 2,
      y1: 0,
    });
    expect(stores[2][2].store.get('range')).toEqual({
      x: 0,
      y: 0,
      x1: 0,
      y1: 0,
    });

    connector.clearRangesExcept(body);
    expect(body.store.get('range')).not.toBeNull();
    expect(stores[1][2].store.get('range')).toBeNull();
    expect(stores[2][1].store.get('range')).toBeNull();
    expect(stores[2][2].store.get('range')).toBeNull();
  });
});
