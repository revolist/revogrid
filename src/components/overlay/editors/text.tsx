import { h } from '@stencil/core';
import { isEnterKeyValue, isTabKeyValue } from '../../../utils/keyCodes.utils';
import { Edition, RevoGrid } from '../../../interfaces';
import { timeout } from '../../../utils/utils';

/**
 * Callback triggered on cell editor save
 * Closes editor when called
 * @param preventFocus - if true editor will not be closed and next cell will not be focused
 */
export type SaveCallback = (value: Edition.SaveData, preventFocus: boolean) => void;

export class TextEditor implements Edition.EditorBase {
  private editInput!: HTMLInputElement;

  public element: Element | null = null;
  public editCell: Edition.EditCell | null = null;

  constructor(public column: RevoGrid.ColumnRegular, private saveCallback?: SaveCallback) {}

  async componentDidRender(): Promise<void> {
    if (this.editInput) {
      await timeout();
      this.editInput?.focus();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    const isEnter = isEnterKeyValue(e.key);
    const isKeyTab = isTabKeyValue(e.key);

    if ((isKeyTab || isEnter) && e.target && this.saveCallback && !e.isComposing) {
      // blur is needed to avoid autoscroll
      this.editInput.blur();
      // request callback which will close cell after all
      this.saveCallback((e.target as HTMLInputElement).value, isKeyTab);
    }
  }

  // required
  render() {
    return (
      <input
        type="text"
        enterkeyhint="enter"
        value={this.editCell?.val || ''}
        ref={el => {
          this.editInput = el;
        }}
        onKeyDown={e => this.onKeyDown(e)}
      />
    );
  }
}
