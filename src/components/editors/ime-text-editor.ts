import type { h, VNode } from '@stencil/core';
import { DATA_COL, DATA_ROW } from '../../utils/consts';
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
  private focusScope?: Element | null;

  prepareForEdit(requestEdit?: () => boolean) {
    this.requestEdit = requestEdit;
    if (requestEdit && this.mode !== 'ready') {
      this.mode = 'ready';
      this.focusPending = true;
      // An edit cancelled before rendering can leave the VNode value empty
      // while the live input still contains the discarded text.
      if (this.editInput) {
        this.editInput.value = '';
      }
    } else if (!requestEdit && this.mode === 'ready') {
      this.mode = 'edit';
    }
  }

  private readonly onCellFocus = (event: Event) => {
    const cell = event.target;
    if (
      this.mode === 'ready' &&
      this.editCell &&
      cell instanceof HTMLElement &&
      cell.getAttribute('role') === 'gridcell' &&
      cell.getAttribute(DATA_COL) === String(this.editCell.x) &&
      cell.getAttribute(DATA_ROW) === String(this.editCell.y) &&
      cell.closest('revogr-overlay-selection') === this.focusScope
    ) {
      this.editInput?.focus({ preventScroll: true });
    }
  };

  async componentDidRender() {
    if (this.mode === 'edit') {
      await super.componentDidRender();
    } else if (this.focusPending) {
      this.focusPending = false;
      // The accessibility layer can focus the cell again without moving selection.
      if (!this.focusScope) {
        this.focusScope = this.editInput?.closest('revogr-overlay-selection');
        this.focusScope?.addEventListener('focusin', this.onCellFocus);
      }
      this.editInput?.focus({ preventScroll: true });
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

  disconnectedCallback() {
    this.focusScope?.removeEventListener('focusin', this.onCellFocus);
    this.focusScope = null;
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
