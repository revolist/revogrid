import { type VNode, h as createElement } from '@stencil/core';
import {
  isEnterKeyValue,
  isShortcutModifier,
  isTab,
} from '../../utils/key.utils';
import { timeout } from '../../utils';
import type { EditCell, EditorBase, ColumnDataSchemaModel } from '@type';
import { isEditInput } from './edit.utils';

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
  /**
   * False while the grid's edit store owns characters typed during mount.
   * Once the input receives or consumes a printable key, the DOM value becomes
   * authoritative and must not be replaced by a delayed store render.
   */
  private inputOwnsValue = false;

  element: Element | null = null;
  editCell?: EditCell = undefined;

  constructor(
    public data: ColumnDataSchemaModel,
    private saveCallback?: SaveCallback,
  ) {}

  /**
   * Callback triggered on cell editor render
   */
  async componentDidRender(): Promise<void> {
    if (this.editInput) {
      await timeout();
      this.editInput?.focus();
    }
  }

  /**
   * Bridges the short period between starting an edit on the focused grid cell
   * and the rendered input receiving browser focus.
   *
   * @param e The original document keydown event.
   * @param pendingValue Characters buffered by the grid before the input mounted.
   * @returns True when this editor consumed the event; false lets the normal
   * keyboard service or native input behavior continue.
   */
  onBeforeKeyDown(e: KeyboardEvent, pendingValue?: any): boolean {
    if (!this.editInput) {
      // The grid must keep buffering until there is an input to receive data.
      return false;
    }

    // Perform the store-to-input handoff once, immediately before native input
    // starts. Moving the caret is essential: assigning input.value resets the
    // selection and would otherwise insert the next character at the beginning.
    if (
      !this.inputOwnsValue &&
      typeof pendingValue === 'string' &&
      (pendingValue.length > 0 || this.editInput.value.length === 0)
    ) {
      this.editInput.value = pendingValue;
      this.editInput.setSelectionRange(
        pendingValue.length,
        pendingValue.length,
      );
    }

    if (e.target instanceof HTMLElement && isEditInput(e.target)) {
      // The event already targets an editor input. Do not append it ourselves;
      // returning false allows the browser's native text insertion to run.
      if (!isShortcutModifier(e) && e.key.length === 1) {
        this.inputOwnsValue = true;
      }
      return false;
    }

    if (!isShortcutModifier(e) && e.key.length === 1) {
      // The input exists but is not focused yet. Consume this character here,
      // focus the input, and let subsequent scanner keys use native insertion.
      e.preventDefault();
      this.inputOwnsValue = true;
      this.editInput.value += e.key;
      this.editInput.focus();
      const valueLength = this.editInput.value.length;
      this.editInput.setSelectionRange(valueLength, valueLength);
      return true;
    }

    if (isEnterKeyValue(e.key) && !e.isComposing) {
      // Barcode scanners commonly finish with Enter. Save even if that Enter
      // reached the grid before the delayed input focus completed.
      e.preventDefault();
      this.onKeyDown(e);
      return true;
    }

    return false;
  }

  onKeyDown(e: KeyboardEvent) {
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
      // Use an initial value rather than a controlled value. After the handoff,
      // a delayed Stencil render must not overwrite characters already inserted
      // natively into the input.
      defaultValue: this.editCell?.val ?? '',
      // save input element as ref for further usage
      ref: (el: HTMLInputElement | null) => {
        this.editInput = el;
      },
      // listen to keydown event on input element
      onKeyDown: (e: KeyboardEvent) => this.onKeyDown(e),
    });
  }
}
