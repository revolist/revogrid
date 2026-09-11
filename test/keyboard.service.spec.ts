import { KeyboardService } from '../src/components/overlay/keyboard.service';

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
