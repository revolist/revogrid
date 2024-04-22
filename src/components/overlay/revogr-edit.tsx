import { Component, Event, EventEmitter, Prop, h, Element, Host, Method } from '@stencil/core';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './editors/text-editor';
import { ColumnRegular } from '../../types/interfaces';
import { EditCell, EditorCtr, SaveDataDetails, EditorBase, SaveData } from '../../types/selection';

/**
 * Cell editor component
 */
@Component({
  tag: 'revogr-edit',
  styleUrl: 'revogr-edit-style.scss',
})
export class RevoEdit {
  @Element() element: HTMLElement;
  @Prop() editCell: EditCell;

  @Prop() column: ColumnRegular | null;
  /** Custom editors register */
  @Prop() editor: EditorCtr | null;

  /** Save on editor close */
  @Prop() saveOnClose = false;
  /** Additional data to pass to renderer */
  @Prop() additionalData: any;

  /** Cell edit event */
  @Event() cellEdit: EventEmitter<SaveDataDetails>;

  /**
   * Close editor event
   * pass true if requires focus next
   */
  @Event() closeEdit: EventEmitter<boolean | undefined>;

  /** Edit session editor */
  private currentEditor: EditorBase | null = null;
  private saveRunning = false;

  @Method() async cancel() {
    this.saveRunning = true;
  }

  onAutoSave() {
    this.saveRunning = true;
    const val = this.currentEditor.getValue && this.currentEditor.getValue();
    // for editor plugin internal usage in case you want to stop save and use your own
    if (this.currentEditor.beforeAutoSave) {
      const canSave = this.currentEditor.beforeAutoSave(val);
      if (canSave === false) {
        return;
      }
    }
    this.onSave(val, true);
  }

  /**
   * Callback triggered on cell editor save
   * Closes editor when called
   * @param preventFocus - if true editor will not be closed and next cell will not be focused
   */
  onSave(val: SaveData, preventFocus?: boolean) {
    this.saveRunning = true;
    if (this.editCell) {
      this.cellEdit.emit({
        rgCol: this.editCell.x,
        rgRow: this.editCell.y,
        type: this.editCell.type,
        prop: this.editCell.prop,
        val,
        preventFocus,
      });
    }
  }

  componentWillRender() {
    // we have active editor
    if (this.currentEditor) {
      return;
    }
    this.saveRunning = false;
    
    // custom editor usage
    // use TextEditor (editors/text.tsx) to create custom editor
    if (this.editor) {
      this.currentEditor = new this.editor(
        this.column,
        // save
        (e, preventFocus) => {
          this.onSave(e, preventFocus);
        },
        // cancel
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

  componentDidRender() {
    if (!this.currentEditor) {
      return;
    }
    this.currentEditor.element = this.element.firstElementChild;
    this.currentEditor.componentDidRender?.();
  }

  disconnectedCallback() {
    if (this.saveOnClose) {
      // shouldn't be cancelled by saveRunning
      // editor requires getValue to be able to save
      if (!this.saveRunning) {
        this.onAutoSave();
      }
    }

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
      return <Host class={EDIT_INPUT_WR}>{this.currentEditor.render(h, this.additionalData)}</Host>;
    }
    return '';
  }
}
