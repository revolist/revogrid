import { VNode, h as createElement } from '@stencil/core';
import { isEnterKeyValue, isTab } from '../../utils/key.utils';
import { timeout } from '../../utils';
import { ColumnDataSchemaModel } from '@type';
import { EditCell, EditorBase, SaveData } from '@type';

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
export type SaveCallback = (value: SaveData | undefined, preventFocus: boolean) => void;

export class TextEditor implements EditorBase {
  editInput: HTMLInputElement | null = null;

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
   *
   * @required @method
   * @param {Function} h - h function from stencil render.
   * @param {Object} _additionalData - additional data from plugin.
   * @returns {VNode} - input element.
   */
  render(h: typeof createElement, _additionalData: any): VNode | VNode[] {
    return h('input', {
      type: 'text',
      enterKeyHint: 'enter',
      // set input value from cell data
      value: this.editCell?.val ?? '',
      // save input element as ref for further usage
      ref: (el: HTMLInputElement | null) => {
        this.editInput = el;
      },
      // listen to keydown event on input element
      onKeyDown: (e: KeyboardEvent) => this.onKeyDown(e),
    });
  }
}
