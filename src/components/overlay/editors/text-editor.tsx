import { h } from '@stencil/core';
import { isEnterKey, isTab } from '../../../utils/key.utils';
import { timeout } from '../../../utils';
import { ColumnRegular } from '../../../types/interfaces';
import { EditCell, EditorBase, SaveData } from '../../../types/selection';

/**
 * Callback triggered on cell editor save
 * Closes editor when called
 * @param preventFocus - if true editor will not be closed and next cell will not be focused
 */
export type SaveCallback = (value: SaveData, preventFocus: boolean) => void;

export class TextEditor implements EditorBase {
  private editInput!: HTMLInputElement;

  public element: Element | null = null;
  public editCell: EditCell | null = null;

  constructor(public column: ColumnRegular, private saveCallback?: SaveCallback) {}

  async componentDidRender(): Promise<void> {
    if (this.editInput) {
      await timeout();
      this.editInput?.focus();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    const isEnter = isEnterKey(e.code);
    const isKeyTab = isTab(e.code);

    if ((isKeyTab || isEnter) && e.target && this.saveCallback && !e.isComposing) {
      // blur is needed to avoid autoscroll
      this.editInput.blur();
      // request callback which will close cell after all
      this.saveCallback(this.getValue(), isKeyTab);
    }
  }
  
  getValue() {
    return this.editInput?.value;
  }

  // required
  render() {
    return (
      <input
        type="text"
        value={this.editCell?.val || ''}
        ref={el => {
          this.editInput = el;
        }}
        onKeyDown={e => this.onKeyDown(e)}
      />
    );
  }
}
