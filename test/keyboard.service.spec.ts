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

  it('consumes direction keys but leaves unrelated keys untouched', () => {
    const { service } = createService();
    const arrowRight = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      cancelable: true,
    });
    const letter = new KeyboardEvent('keydown', {
      code: 'KeyA',
      cancelable: true,
    });

    service.changeDirectionKey(arrowRight, true);
    service.changeDirectionKey(letter, true);

    expect(arrowRight.defaultPrevented).toBe(true);
    expect(letter.defaultPrevented).toBe(false);
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

  it('extends the existing range to the first row', () => {
    const { service, ranges, selectionState } = createService();

    (service as any).keyEdgeChange(
      { y: -1 },
      selectionState.range,
      selectionState.focus,
      true,
    );

    expect(ranges).toEqual([{ x: 3, y: 0, x1: 3, y1: 2 }]);
  });
});

describe('KeyboardService pending edit input', () => {
  function setup(editorInput: HTMLInputElement | null) {
    const state: Record<string, any> = {
      edit: { x: 1, y: 0, val: 'C' },
      focus: { x: 1, y: 0 },
      range: null,
    };
    const selectionStore = {
      get: (key: string) => state[key],
      set: (key: string, value: any) => {
        state[key] = value;
      },
    } as any;

    const service = new KeyboardService({
      selectionStore,
      // Mirrors revogr-overlay-selection: the key goes to the editor input when
      // one is rendered, otherwise the caller is told to buffer it.
      appendEditValue: (value: string) => {
        if (!editorInput) {
          return false;
        }
        editorInput.value += value;
        return true;
      },
      change: () => false,
      cancel: () => undefined,
      clearCell: () => undefined,
      focus: () => false,
      getData: () => ({}),
      internalPaste: () => undefined,
      range: () => false,
      selectAll: () => undefined,
    });

    const press = () =>
      service.keyDown(
        new KeyboardEvent('keydown', { key: 'H', code: 'KeyH' }),
        false,
        true,
        { focus: state.focus, range: state.range },
      );

    return { press, state };
  }

  it('types into the editor input and leaves the store untouched', async () => {
    const editorInput = document.createElement('input');
    editorInput.value = 'C';
    const { press, state } = setup(editorInput);

    await press();

    expect(editorInput.value).toBe('CH');
    // A store change would reach the input only on the next render, and that
    // render would overwrite anything typed into the input meanwhile.
    expect(state.edit.val).toBe('C');
  });

  it('buffers into the store while no editor input is rendered', async () => {
    const { press, state } = setup(null);

    await press();

    expect(state.edit.val).toBe('CH');
  });
});
