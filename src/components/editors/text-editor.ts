import { type VNode, h as createElement } from '@stencil/core';
import { isEnterKeyValue, isTab } from '../../utils/key.utils';
import { timeout } from '../../utils';
import type { EditCell, EditorBase, ColumnDataSchemaModel } from '@type';

/**
 * Represents a cell editor in a grid.
 *
 * It's a good place to start with your own editor.
 * It manages the editing of cells by handling events, saving data, rendering the editor UI, and managing the lifecycle of the editor instance.
 */

/**
 * Callback triggered on cell editor save
 * Closes editor when called
 * @param preventFocus - if true editor will not be closed and next cell will not be focused
 */
export type SaveCallback = (value: any, preventFocus: boolean) => void;

export class TextEditor implements EditorBase {
  editInput: HTMLInputElement | null = null;

  element: Element | null = null;
  editCell?: EditCell = undefined;
  imeReady = false;
  startNativeEdit?: () => boolean;
  nativeEditing = false;
  private focused = false;

  constructor(
    public data: ColumnDataSchemaModel,
    private saveCallback?: SaveCallback,
  ) {}

  /**
   * Callback triggered on cell editor render
   */
  async componentDidRender(): Promise<void> {
    if (
      this.editInput && (
        (!this.imeReady && !this.nativeEditing) || !this.focused ||
        (this.imeReady && document.activeElement === document.body)
      )
    ) {
      this.focused = true;
      await timeout();
      this.editInput?.focus({ preventScroll: true });
    }
  }

  appendPendingInput(value: string): boolean {
    if (!this.editInput) {
      return false;
    }
    this.editInput.value += value;
    this.editInput.focus();
    return true;
  }

  private onNativeInput() {
    if (!this.imeReady || this.nativeEditing) {
      return;
    }
    this.nativeEditing = true;
    if (!this.startNativeEdit?.()) {
      this.nativeEditing = false;
      if (this.editInput) {
        this.editInput.value = '';
        this.editInput.blur();
      }
    }
  }

  onKeyDown(e: KeyboardEvent) {
    if ((this.imeReady && !this.nativeEditing) || e.isComposing || e.keyCode === 229) {
      return;
    }
    const isEnter = isEnterKeyValue(e.key);
    const isKeyTab = isTab(e.key);

    if (
      (isKeyTab || isEnter) &&
      e.target &&
      this.saveCallback &&
      !e.isComposing
    ) {
      // blur is needed to avoid autoscroll
      this.beforeDisconnect();
      // request callback which will close cell after all
      this.saveCallback(this.getValue(), isKeyTab);
    }
  }

  /**
   * IMPORTANT: Prevent scroll glitches when editor is closed and focus is on current input element.
   */
  beforeDisconnect() {
    this.editInput?.blur();
  }

  /**
   * Get value from input
   */
  getValue() {
    return this.editInput?.value;
  }

  /**
   * Render method for Editor plugin.
   * Renders input element with passed data from cell.
   * @param {Function} h - h function from stencil render.
   * @param {Object} _additionalData - additional data from plugin.
   * @returns {VNode} - input element.
   */
  render(h: typeof createElement, _additionalData: any): VNode | VNode[] {
    return h('input', {
      type: 'text',
      enterKeyHint: 'enter',
      // Retain the native value during fast edit so a render cannot replace
      // an ongoing composition with the cell model.
      value: this.nativeEditing ? this.editInput?.value ?? '' :
        this.imeReady ? '' : this.editCell?.val ?? '',
      'data-rg-ime-ready': this.imeReady ? '' : undefined,
      'aria-label': 'Cell editor',
      onCompositionStart: () => this.onNativeInput(),
      onInput: () => this.onNativeInput(),
      // save input element as ref for further usage
      ref: (el: HTMLInputElement | null) => {
        this.editInput = el;
      },
      // listen to keydown event on input element
      onKeyDown: (e: KeyboardEvent) => this.onKeyDown(e),
    });
  }
}
