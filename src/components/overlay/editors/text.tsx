import {h, VNode} from '@stencil/core';
import {codesLetter} from '../../../utils/keyCodes';
import {isTab} from '../../../utils/keyCodes.utils';
import {Edition, RevoGrid} from '../../../interfaces';
import {timeout} from '../../../utils/utils';

export class TextEditor implements Edition.EditorBase {
    private editInput!: HTMLInputElement;

    public element: Element|null = null;
    public editCell: Edition.EditCell|null = null;

    constructor(
        public column: RevoGrid.ColumnRegular,
        private saveCallback?: (value: Edition.SaveData, preventFocus: boolean) => void
    ) {}

    async componentDidRender(): Promise<void> {
        if (this.editInput) {
            await timeout();
            this.editInput?.focus();
        }
    }

    disconnectedCallback(): void {}

    private onKeyDown(e: KeyboardEvent): void {
        const isEnter: boolean = codesLetter.ENTER === e.code;
        const isKeyTab: boolean = isTab(e.code);

        if ((isKeyTab||isEnter) && e.target && this.saveCallback) {
            // blur is needed to avoid autoscroll
            this.editInput.blur();
            // request callback which will close cell after all
            this.saveCallback((e.target as HTMLInputElement).value, isKeyTab);
        }
    }

    // required
    render(): VNode {
        return <input type='text' value={this.editCell?.val || ''} ref={(el) => {this.editInput = el}} onKeyDown={(e) => this.onKeyDown(e)}/>
    }
}
