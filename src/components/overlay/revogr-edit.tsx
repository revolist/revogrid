import { Component, Event, EventEmitter, Prop, h, Element, Host, Watch, Method } from '@stencil/core';

import { Edition, RevoGrid } from '../../interfaces';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './editors/text';

@Component({
  tag: 'revogr-edit',
  styleUrl: 'revogr-edit-style.scss',
})
export class RevoEdit {
  @Element() element: HTMLElement;
  @Prop() editCell: Edition.EditCell;
  @Prop() saveBeforeClose: boolean = false;

  @Prop() column: RevoGrid.ColumnRegular | null;
  /** Custom editors register */
  @Prop() editor: Edition.EditorCtr | null;

  @Event({ bubbles: false }) cellEdit: EventEmitter<Edition.SaveDataDetails>;

  /** Close editor event */
  @Event({ bubbles: false }) closeEdit: EventEmitter<boolean | undefined>;
  private currentEditor: Edition.EditorBase | null = null;
  private saveRunning = false;

  // shouldn't be cancelled by saveRunning
  // editor requires getValue
  @Watch('saveBeforeClose') saveOnClose(saveBeforeClose = false) {
    if (saveBeforeClose && !this.saveRunning && this.currentEditor.getValue) {
      this.saveRunning = true;
      this.onSave(this.currentEditor.getValue(), true);
    }
  }

  @Method() async cancel() {
    this.saveRunning = true;
  }

  /** Callback triggered on cell editor save */
  onSave(val: Edition.SaveData, preventFocus?: boolean): void {
    this.saveRunning = true;
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
    this.saveRunning = false;
    // fresh run
    // editor defined for the column
    if (this.editor) {
      this.currentEditor = new this.editor(
        this.column,
        (e, preventFocus) => {
          this.onSave(e, preventFocus);
        },
        focusNext => {
          this.saveRunning = true;
          this.closeEdit.emit(focusNext);
        },
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
    this.saveRunning = false;
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
