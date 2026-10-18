import {
  Component,
  Event,
  EventEmitter,
  Prop,
  h,
  Element,
  Host,
  Listen,
  Method,
} from '@stencil/core';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './text-editor';
import { ColumnDataSchemaModel } from '@type';
import {
  EditCell,
  EditorCtr,
  SaveDataDetails,
  EditorBase,
} from '@type';

import { isEditorCtrConstructible } from './edit.utils';

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
  @Prop() column: ColumnDataSchemaModel | null;
  /**
   * Custom editors register
   */
  @Prop() editor: EditorCtr | null;

  /**
   * Save on editor close. Defines if data should be saved on editor close.
   */
  @Prop() saveOnClose = false;

  /** Keep the built-in editor mounted but transparent until native input. */
  @Prop() imeReady = false;
  /** Requests editing through the selection owner. False means editing was vetoed. */
  @Prop() requestNativeEdit?: () => boolean;
  /**
   * Additional data to pass to renderer
   */
  @Prop() additionalData: any;

  /**
   * Cell edit event initiator, first in the cellEdit event chain
   */
  @Event({ eventName: 'celleditinit' }) cellEdit: EventEmitter<SaveDataDetails>;

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
  private inputMode: 'ready' | 'native' | 'edit' = 'edit';

  /** Focus the native IME input while the cell is selected. */
  @Method() async focusReadyInput() {
    if (this.inputMode === 'ready' && this.currentEditor instanceof TextEditor) {
      this.currentEditor.editInput?.focus({ preventScroll: true });
    }
  }

  /** Cancel pending changes without autosave. */
  @Method() async cancelChanges() {
    this.preventSaveOnClose = true;
  }

  /**
   * Before editor got disconnected.
   * Can be triggered multiple times before actual disconnect.
   */
  @Method() async beforeDisconnect() {
    if (this.inputMode !== 'ready') {
      this.currentEditor?.beforeDisconnect?.();
    }
  }

  @Listen('compositionstart')
  @Listen('input')
  onNativeInput(e: Event) {
    if (this.inputMode !== 'ready' || this.editor ||
      !(this.currentEditor instanceof TextEditor) || e.target !== this.currentEditor.editInput) {
      return;
    }
    this.inputMode = 'native';
    // Assign the session synchronously: a fast Tab can arrive before rendering.
    this.currentEditor.editCell = this.editCell;
    if (!this.requestNativeEdit?.()) {
      this.inputMode = 'ready';
      this.currentEditor.editCell = undefined;
      this.currentEditor.editInput!.value = '';
      this.currentEditor.beforeDisconnect();
    }
  }

  @Listen('internalappendeditvalue')
  onInternalAppendEditValue(e: CustomEvent<string>) {
    if (this.currentEditor?.appendPendingInput?.(e.detail)) {
      e.preventDefault();
    }
  }

  onAutoSave() {
    this.preventSaveOnClose = true;
    const val = this.currentEditor?.getValue?.();
    // For Editor plugin internal usage.
    // When you want to prevent save and use custom save of your own.
    if (this.currentEditor?.beforeAutoSave) {
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
  onSave(val?: any, preventFocus?: boolean) {
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
    if (this.imeReady && this.inputMode !== 'ready') {
      // A finished/cancelled session returns to an empty ready input.
      this.currentEditor = null;
    }
    if (!this.imeReady && this.inputMode === 'ready') {
      this.inputMode = 'edit';
    }
    // Active editor present and not yet closed.
    if (this.currentEditor || !this.column) {
      return;
    }
    this.preventSaveOnClose = false;
    this.inputMode = this.imeReady ? 'ready' : 'edit';

    // Custom editor usage.
    // Start with TextEditor (editors/text.tsx) for Custom editor.
    // It can be class or function
    if (this.editor) {
      // if editor is constructible
      if (isEditorCtrConstructible(this.editor)) {
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
      // if editor is function
      } else {
        this.currentEditor = this.editor(
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
      }
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
    const firstRender = !this.currentEditor.element;
    this.currentEditor.element = this.element.firstElementChild;
    if (this.inputMode === 'edit') {
      this.currentEditor.componentDidRender?.();
    } else if (firstRender) {
      void this.focusReadyInput();
    }
  }

  disconnectedCallback() {
    if (this.saveOnClose && this.inputMode !== 'ready') {
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
      // During native editing the browser owns the current value, including
      // unfinished composition. Never replace it with the original cell model.
      this.currentEditor.editCell = this.inputMode === 'ready' ? undefined :
        this.inputMode === 'native'
          ? { ...this.editCell, val: this.currentEditor.getValue?.() }
          : this.editCell;
      return (
        <Host class={{ [EDIT_INPUT_WR]: true, 'ime-ready': this.imeReady }}>
          {this.currentEditor.render(h, this.additionalData)}
        </Host>
      );
    }
    return '';
  }
}
