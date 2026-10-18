import type { ColumnDataSchemaModel } from '@type';
import { TextEditor, type SaveCallback } from './text-editor';

/** Built-in text editor that keeps a native input ready for IME composition. */
export class ImeTextEditor extends TextEditor {
  private mode: 'ready' | 'native' | 'edit' = 'ready';
  private focusPending = true;

  constructor(
    data: ColumnDataSchemaModel,
    save: SaveCallback,
    private readonly requestEdit: () => boolean,
  ) {
    super(data, save);
  }

  setReady(ready: boolean) {
    if (ready && this.mode !== 'ready') {
      this.mode = 'ready';
      this.focusPending = true;
    } else if (!ready && this.mode === 'ready') {
      // Enter/double-click opens the existing cell value without native input.
      this.mode = 'edit';
    }
  }

  focusReadyInput() {
    if (this.mode === 'ready') {
      this.editInput?.focus({ preventScroll: true });
    }
  }

  async componentDidRender(): Promise<void> {
    this.editInput?.addEventListener('compositionstart', this.onNativeInput);
    this.editInput?.addEventListener('input', this.onNativeInput);
    if (this.mode === 'edit') {
      await super.componentDidRender();
    } else if (this.focusPending) {
      this.focusPending = false;
      this.focusReadyInput();
    }
  }

  private readonly onNativeInput = () => {
    if (this.mode !== 'ready') {
      return;
    }
    // Synchronous activation also handles a Tab arriving before the next render.
    this.mode = 'native';
    if (!this.requestEdit()) {
      this.mode = 'ready';
      if (this.editInput) {
        this.editInput.value = '';
      }
      super.beforeDisconnect();
    }
  };

  onKeyDown(e: KeyboardEvent) {
    if (this.mode !== 'ready') {
      super.onKeyDown(e);
    }
  }

  beforeDisconnect() {
    if (this.mode !== 'ready') {
      super.beforeDisconnect();
    }
  }

  beforeAutoSave() {
    // The transparent input is empty until a real edit starts.
    return this.mode !== 'ready';
  }

  protected getInputValue() {
    if (this.mode === 'ready') {
      return '';
    }
    // Renders must preserve the browser's unfinished composition.
    return this.mode === 'native' ? this.getValue() : super.getInputValue();
  }

  disconnectedCallback() {
    this.editInput?.removeEventListener('compositionstart', this.onNativeInput);
    this.editInput?.removeEventListener('input', this.onNativeInput);
  }
}
