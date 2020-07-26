import {Component, EventEmitter, Event, h, Prop} from '@stencil/core';
import {codesLetter} from '../../../utils/keyCodes';
import {Edition} from '../../../interfaces';

@Component({
    tag: 'revogr-text-editor'
})
export class TextEditor implements Edition.EditorBase {
    private editInput!: HTMLInputElement;
    @Prop() value: string;
    @Event() edit: EventEmitter<Edition.SaveData>;

    componentDidRender(): void {
        if (this.editInput) {
            this.editInput.value = this.value;
            setTimeout(() => this.editInput.focus(), 0);
        }
    }
    render() {
        return <input type='text' ref={(el) => {this.editInput = el}}  onKeyDown={(e) => this.onKeyDown(e)}/>
    }

    private onKeyDown(e: KeyboardEvent): void {
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isEnter && e.target) {
            this.edit.emit((e.target as HTMLInputElement).value);
        }
    }
}