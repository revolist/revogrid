import {
  Component,
  Event,
  EventEmitter,
  Prop,
  h,
  Element,
  Host,
  Method,
} from '@stencil/core';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './text-editor';
import { ColumnRegular } from '../../types/interfaces';
import {
  EditCell,
  EditorCtr,
  SaveDataDetails,
  EditorBase,
  SaveData,
} from '../../types/selection';

/**
 * Represents a cell editor in a grid.
 * It manages the editing of cells by handling events, saving data, rendering the editor UI,
 * and managing the lifecycle of the editor instance.
 */
@Component({
  tag: 'revogr-edit',
  styleUrl: 'revogr-edit-style.scss',
})
export class RevoEdit {
  /**
   * Cell to edit data.
   */
  @Prop() editCell: EditCell;

  /**
   * Column data for editor.
   */
  @Prop() column: ColumnRegular | null;
  /**
   * Custom editors register
   */
  @Prop() editor: EditorCtr | null;

  /**
   * Save on editor close. Defines if data should be saved on editor close.
   */
  @Prop() saveOnClose = false;
  /**
   * Additional data to pass to renderer
   */
  @Prop() additionalData: any;

  /**
   * Cell edit event
   */
  @Event({ eventName: 'celledit' }) cellEdit: EventEmitter<SaveDataDetails>;

  /**
   * Close editor event
   * pass true if requires focus next
   */
  @Event({ eventName: 'closeedit' }) closeEdit: EventEmitter<
    boolean | undefined
  >;

  /** Edit session editor */
  @Element() element: HTMLElement;
  private currentEditor: EditorBase | null = null;
  private preventSaveOnClose = false;

  /**
   * Cancel pending changes flag. Editor will be closed without autosave.
   */
  @Method() async cancelChanges() {
    this.preventSaveOnClose = true;
  }

  /**
   * Before editor got disconnected.
   * Can be triggered multiple times before actual disconnect.
   */
  @Method() async beforeDisconnect() {
    this.currentEditor?.beforeDisconnect?.();
  }

  onAutoSave() {
    this.preventSaveOnClose = true;
    const val = this.currentEditor.getValue?.();
    // For Editor plugin internal usage.
    // When you want to prevent save and use custom save of your own.
    if (this.currentEditor.beforeAutoSave) {
      const canSave = this.currentEditor.beforeAutoSave(val);
      if (canSave === false) {
        return;
      }
    }
    this.onSave(val, true);
  }

  /**
   * Callback triggered when cell editor saved.
   * Closes editor when called.
   * @param preventFocus - if true, editor will not be closed & next cell will not be focused.
   */
  onSave(val: SaveData, preventFocus?: boolean) {
    this.preventSaveOnClose = true;
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
    // Active editor present
    if (this.currentEditor) {
      return;
    }
    this.preventSaveOnClose = false;

    // Custom editor usage.
    // Start with TextEditor (editors/text.tsx) for Custom editor.
    if (this.editor) {
      this.currentEditor = new this.editor(
        this.column,
        // save callback
        (e, preventFocus) => {
          this.onSave(e, preventFocus);
        },
        // cancel callback
        focusNext => {
          this.preventSaveOnClose = true;
          this.closeEdit.emit(focusNext);
        },
      );
      return;
    }
    // Default text editor usage
    this.currentEditor = new TextEditor(this.column, (e, preventFocus) =>
      this.onSave(e, preventFocus),
    );
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
      // Can not be cancelled by `preventSaveOnClose` prop.
      // Editor requires `getValue` to be able to save.
      if (!this.preventSaveOnClose) {
        this.onAutoSave();
      }
    }

    this.preventSaveOnClose = false;
    if (!this.currentEditor) {
      return;
    }

    this.currentEditor.disconnectedCallback?.();
    this.currentEditor.element = null;
    this.currentEditor = null;
  }

  render() {
    if (this.currentEditor) {
      this.currentEditor.editCell = this.editCell;
      return (
        <Host class={EDIT_INPUT_WR}>
          {this.currentEditor.render(h, this.additionalData)}
        </Host>
      );
    }
    return '';
  }
}
