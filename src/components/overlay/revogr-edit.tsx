import {Component, Event, EventEmitter, Prop, h, VNode, Element} from '@stencil/core';

import {Edition, RevoGrid} from '../../interfaces';
import {TextEditor} from './editors/text';

@Component({
    tag: 'revogr-edit',
    styleUrl: 'revogr-edit-style.scss'
})
export class Edit {
    @Element() element: HTMLElement;
    @Prop() editCell: Edition.EditCell;
    private currentEditor: Edition.EditorBase|null = null;

    @Prop() column: RevoGrid.ColumnRegular|null;
    /** Custom editors register */
    @Prop() editor: Edition.EditorCtr|null;

    @Event({ bubbles: false  }) cellEdit: EventEmitter<Edition.SaveDataDetails>;

    /** Close editor event */
    @Event({ bubbles: false }) closeEdit: EventEmitter;


    /** Callback triggered on cell editor save */
    onSave(val: Edition.SaveData, preventFocus?: boolean): void {
        if (this.editCell) {
            this.cellEdit.emit({
                col: this.editCell.x,
                row: this.editCell.y,
                val,
                preventFocus
            });
        }
    }

    componentWillRender(): void {
        if (!this.currentEditor) {
            if (this.editor) {
                this.currentEditor = new this.editor(
                    this.column,
                    (e, preventFocus) => this.onSave(e, preventFocus),
                    () => this.closeEdit.emit()
                );
            } else {
                this.currentEditor = new TextEditor(this.column, (e, preventFocus) => this.onSave(e, preventFocus));
            }
        }
    }

    componentDidRender(): void {
        if (!this.currentEditor) {
            return;
        }
        this.currentEditor.element = this.element.firstElementChild;
        this.currentEditor.componentDidRender && this.currentEditor.componentDidRender();
    }

    disconnectedCallback(): void {
        if (!this.currentEditor) {
            return;
        }

        this.currentEditor.disconnectedCallback && this.currentEditor.disconnectedCallback();
        if (this.currentEditor.element) {
            this.currentEditor.element = null;
        }
        this.currentEditor = null;
    }

    render() {
        if (this.currentEditor) {
            this.currentEditor.editCell = this.editCell;
            return this.currentEditor.render(h as unknown as RevoGrid.HyperFunc<VNode>);
        }
        return '';
    }
}
