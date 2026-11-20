import type { h, VNode } from '@stencil/core';
import { isShortcutModifier } from '../../utils/key.utils';
import { TextEditor } from './text-editor';

/**
 * Keeps a native input focused on selection so IME composition can start with
 * the first keystroke. Use as the editor on a column or a column type.
 */
export class ImeTextEditor extends TextEditor {
  static readonly prepareOnFocus = true;

  private requestEdit?: () => boolean;
  private mode: 'ready' | 'native' | 'edit' = 'edit';
  private focusPending = false;

  prepareForEdit(requestEdit?: () => boolean) {
    this.requestEdit = requestEdit;
    if (requestEdit && this.mode !== 'ready') {
      this.mode = 'ready';
      this.focusPending = true;
    } else if (!requestEdit && this.mode === 'ready') {
      this.mode = 'edit';
    }
  }

  focusReadyInput() {
    if (this.mode === 'ready') {
      this.editInput?.focus({ preventScroll: true });
    }
  }

  async componentDidRender() {
    if (this.mode === 'edit') {
      await super.componentDidRender();
    } else if (this.focusPending) {
      this.focusPending = false;
      this.focusReadyInput();
    }
  }

  private startNativeEdit() {
    if (this.mode !== 'ready') {
      return;
    }
    // Preserve the same input and its browser-owned composition on activation.
    this.mode = 'native';
    if (!this.requestEdit?.()) {
      this.mode = 'ready';
      if (this.editInput) {
        this.editInput.value = '';
      }
      super.beforeDisconnect();
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      (this.mode === 'ready' &&
        event.key.length === 1 &&
        !isShortcutModifier(event))
    ) {
      // Let the native input handle these keys without triggering grid shortcuts.
      event.stopPropagation();
      return;
    }
    if (this.mode !== 'ready') {
      super.onKeyDown(event);
    }
  }

  beforeDisconnect() {
    if (this.mode !== 'ready') {
      super.beforeDisconnect();
    }
  }

  beforeAutoSave() {
    return this.mode !== 'ready';
  }

  render(createElement: typeof h): VNode {
    const value = this.mode === 'native' ? this.getValue() : this.editCell?.val;
    return createElement('input', {
      type: 'text',
      enterKeyHint: 'enter',
      tabIndex: this.mode === 'ready' ? -1 : undefined,
      'aria-label': this.data.column.name ?? String(this.data.prop),
      value: this.mode === 'ready' ? '' : value ?? '',
      ref: (input: HTMLInputElement | null) => {
        this.editInput = input;
      },
      onCompositionStart: () => this.startNativeEdit(),
      onInput: () => this.startNativeEdit(),
      onKeyDown: (event: KeyboardEvent) => this.onKeyDown(event),
    });
  }
}
