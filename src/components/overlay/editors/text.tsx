import {h, VNode} from '@stencil/core';
import {codesLetter} from '../../../utils/keyCodes';
import {Edition, RevoGrid} from '../../../interfaces';
import {timeout} from '../../../utils/utils';

export class TextEditor implements Edition.EditorBase {
    private editInput!: HTMLInputElement;

    public element: Element|null = null;
    public editCell: Edition.EditCell|null = null;

    constructor(
        public column: RevoGrid.ColumnRegular,
        private editCallback?: (value: Edition.SaveData) => void
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
        if (isEnter && e.target && this.editCallback) {
            // blur is needed to avoid autoscroll
            this.editInput.blur();
            // request callback which will close cell after all
            this.editCallback((e.target as HTMLInputElement).value);
        }
    }

    // required
    render(): VNode {
        return <input type='text' value={this.editCell?.val || ''} ref={(el) => {this.editInput = el}} onKeyDown={(e) => this.onKeyDown(e)}/>
    }
}
