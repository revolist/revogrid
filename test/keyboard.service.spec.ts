import { KeyboardService } from '../src/components/overlay/keyboard.service';

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
    selectAll: () => undefined,
  });
  return { service, ranges, focuses, selectionState };
}

describe('KeyboardService grid-edge navigation', () => {
  it('recognizes Ctrl and Cmd arrows as edge navigation', () => {
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
    ).toMatchObject({ changes: { x: -1 }, edge: true });
    expect(
      service.changeDirectionKey(
        new KeyboardEvent('keydown', {
          code: 'ArrowDown',
          metaKey: true,
          cancelable: true,
        }),
        true,
      ),
    ).toMatchObject({ changes: { y: 1 }, edge: true });
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

  it('jumps focus directly to the known last row', () => {
    const { service, focuses, selectionState } = createService();

    (service as any).keyEdgeChange(
      { y: 1 },
      selectionState.range,
      selectionState.focus,
      false,
    );

    expect(focuses).toEqual([
      {
        cell: { x: 3, y: 19 },
        changes: { y: 17 },
      },
    ]);
  });

  it('extends the existing range to the known last column', () => {
    const { service, ranges, selectionState } = createService();

    (service as any).keyEdgeChange(
      { x: 1 },
      selectionState.range,
      selectionState.focus,
      true,
    );

    expect(ranges).toEqual([{ x: 3, y: 2, x1: 7, y1: 6 }]);
  });
});
