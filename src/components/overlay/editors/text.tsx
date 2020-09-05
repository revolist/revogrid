import {h, VNode} from '@stencil/core';
import {codesLetter} from '../../../utils/keyCodes';
import {Edition} from '../../../interfaces';

export class TextEditor implements Edition.EditorBase {
    private editInput!: HTMLInputElement;

    public element: Element|null = null;

    constructor(private editCallback?: (value: Edition.SaveData) => void, public value = '') {
    }

    componentDidRender(): void {
        if (this.editInput) {
            this.editInput.value = this.value;
            setTimeout(() => this.editInput.focus(), 0);
        }
    }

    disconnectedCallback(): void {}

    // required
    render(): VNode {
        return <input
            type='text'
            value={this.value}
            ref={(el) => {this.editInput = el}}
            onKeyDown={(e) => this.onKeyDown(e)}/>
    }

    private onKeyDown(e: KeyboardEvent): void {
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isEnter && e.target && this.editCallback) {
            this.editCallback((e.target as HTMLInputElement).value);
        }
    }
}
