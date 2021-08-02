import { Component, Event, EventEmitter, Prop, h, Element, Host } from '@stencil/core';

import { Edition, RevoGrid } from '../../interfaces';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './editors/text';

@Component({
  tag: 'revogr-edit',
  styleUrl: 'revogr-edit-style.scss',
})
export class Edit {
  @Element() element: HTMLElement;
  @Prop() editCell: Edition.EditCell;
  private currentEditor: Edition.EditorBase | null = null;

  @Prop() column: RevoGrid.ColumnRegular | null;
  /** Custom editors register */
  @Prop() editor: Edition.EditorCtr | null;

  @Event({ bubbles: false }) cellEdit: EventEmitter<Edition.SaveDataDetails>;

  /** Close editor event */
  @Event({ bubbles: false }) closeEdit: EventEmitter<boolean | undefined>;

  /** Callback triggered on cell editor save */
  onSave(val: Edition.SaveData, preventFocus?: boolean): void {
    if (this.editCell) {
      this.cellEdit.emit({
        rgCol: this.editCell.x,
        rgRow: this.editCell.y,
        val,
        preventFocus,
      });
    }
  }

  componentWillRender(): void {
    // we have active editor
    if (this.currentEditor) {
      return;
    }
    // fresh run
    // editor defined for the column
    if (this.editor) {
      this.currentEditor = new this.editor(
        this.column,
        (e, preventFocus) => this.onSave(e, preventFocus),
        focusNext => this.closeEdit.emit(focusNext),
      );
      return;
    }
    // default text editor usage
    this.currentEditor = new TextEditor(this.column, (e, preventFocus) => this.onSave(e, preventFocus));
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
      return <Host class={EDIT_INPUT_WR}>{this.currentEditor.render(h)}</Host>;
    }
    return '';
  }
}
