import { Component, Event, EventEmitter, h, Host, Listen, Prop, VNode, Element, Watch } from '@stencil/core';

import { Edition, Observable, RevoGrid, Selection } from '../../interfaces';
import ColumnService from '../data/columnService';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/keyCodes';
import { SELECTION_BORDER_CLASS } from '../../utils/consts';
import { DataSourceState } from '../../store/dataSource/data.store';
import { isRangeSingleCell } from '../../store/selection/selection.helpers';
import { getCurrentCell, getElStyle } from './selection.utils';
import { isEditInput } from './editors/edit.utils';
import { KeyboardService } from './keyboard.service';
import { AutoFillService } from './autofill.service';
import { ClipboardService } from './clipboard.service';

@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss',
})
export class OverlaySelection {
  protected columnService: ColumnService;

  protected selectionStoreService: SelectionStoreService;
  private keyboardService: KeyboardService | null = null;
  private autoFillService: AutoFillService | null = null;
  private clipboardService: ClipboardService | null = null;
  private orderEditor: HTMLRevogrOrderEditorElement;

  @Element() element: HTMLElement;

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;
  @Prop() useClipboard: boolean;

  /** Dynamic stores */
  @Prop() selectionStore: Observable<Selection.SelectionStoreState>;
  @Prop() dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol: Observable<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  @Prop() colData: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
  /** Last cell position */
  @Prop() lastCell: Selection.Cell;
  /** Custom editors register */
  @Prop() editors: Edition.Editors;

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  @Event({ cancelable: true }) internalCopy: EventEmitter;
  @Event({ cancelable: true }) internalPaste: EventEmitter;

  @Event({ cancelable: true }) internalCellEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Event({ cancelable: true }) internalFocusCell: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Event({ cancelable: true }) internalNextStoreFocus: EventEmitter<Selection.Cell>;

  @Event({ bubbles: false }) setEdit: EventEmitter<Edition.BeforeEdit>;
  /**
   * Used for editors support when close requested
   */
  @Event() cancelEdit: EventEmitter;
  @Event() setRange: EventEmitter<Selection.RangeArea>;
  @Event() setTempRange: EventEmitter<Selection.TempRange | null>;

  @Event({ bubbles: false }) focusCell: EventEmitter<Selection.FocusedCells>;
  /** Selection range changed */
  @Event({ cancelable: true }) internalSelectionChanged: EventEmitter<Selection.ChangedRange>;

  /** Range data apply */
  @Event({ cancelable: true }) internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;
  /**
   * Before key up event proxy, used to prevent key up trigger.
   * If you have some custom behaviour event, use this event to check if it wasn't processed by internal logic.
   * Call preventDefault().
   */
  @Event({ eventName: 'beforekeydown' })
  beforeKeyDown: EventEmitter;
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------

  @Listen('mousemove', { target: 'document' }) onMouseMove(e: MouseEvent) {
    if (this.selectionStoreService.focused) {
      this.autoFillService.selectionMouseMove(e);
    }
  }

  /** Pointer left document, clear any active operation */
  @Listen('mouseleave', { target: 'document' }) onMouseOut() {
    this.autoFillService.clearAutoFillSelection();
  }

  /** Action finished inside of the document */
  @Listen('mouseup', { target: 'document' }) onMouseUp() {
    this.autoFillService.clearAutoFillSelection();
  }

  /** Row drag started */
  @Listen('dragStartCell') onCellDrag(e: CustomEvent<MouseEvent>) {
    this.orderEditor?.dragStart(e.detail);
  }

  /** Recived keyboard down from element */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    this.keyboardService?.keyUp(e);
  }

  /** Recived keyboard down from element */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    // Emit before key down event and check if default prevention is set.
    const proxy = this.beforeKeyDown.emit({ original: e, ...this.getData()});
    if (e.defaultPrevented || proxy.defaultPrevented) {
      return;
    }
    this.keyboardService?.keyDown(e, this.range);
  }

  private focusCurrent(cell: Selection.Cell, end: Selection.Cell) {
    const currentFocusEvent = this.internalFocusCell.emit(this.columnService.getSaveData(cell.y, cell.x));
    if (currentFocusEvent.defaultPrevented) {
      return false;
    }
    const focused = { focus: cell, end };
    return !this.focusCell.emit(focused)?.defaultPrevented;
  }

  /** Create selection store */
  private unsubscribeSelectionStore: { (): void }[] = [];
  @Watch('selectionStore') selectionServiceSet(s: Observable<Selection.SelectionStoreState>) {
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore = [];

    this.unsubscribeSelectionStore.push(s.onChange('nextFocus', (v) => {
      this.focusCurrent(v, v);
    }));
    this.selectionStoreService = new SelectionStoreService(s, {
      changeRange: range => !this.setRange.emit(range)?.defaultPrevented,
      focus: (focus, end, focusNextStore) => {
        if (!focusNextStore) {
         return this.focusCurrent(focus, end);
        } else {
          this.internalNextStoreFocus.emit(focus);
          return false;
        }
      },
    });

    this.keyboardService = new KeyboardService({
      selectionStoreService: this.selectionStoreService,
      selectionStore: s,
      doEdit: (v) => this.doEdit(v),
      cancelEdit: () => this.closeEdit(),
      clearCell: () => this.clearCell(),
      getData: () => this.getData(),
      internalPaste: () => this.internalPaste.emit()
    });
    this.createAutoFillService();
    this.createClipboardService();
  }

  @Watch('dimensionRow')
  @Watch('dimensionCol')
  createAutoFillService() {
    this.autoFillService = new AutoFillService({
      selectionStoreService: this.selectionStoreService,
      dimensionRow: this.dimensionRow,
      dimensionCol: this.dimensionCol,
      columnService: this.columnService,
      dataStore: this.dataStore,

      setTempRange: (e) => this.setTempRange.emit(e),
      internalSelectionChanged: (e) => this.internalSelectionChanged.emit(e),
      internalRangeDataApply: (e) => this.internalRangeDataApply.emit(e),
      setRange: (e) => this.setRange.emit(e),
      getData: () => this.getData(),
    });
  }

  @Watch('dataStore')
  @Watch('colData')
  columnServiceSet() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.createAutoFillService();
    this.createClipboardService();
  }

  createClipboardService() {
    this.clipboardService = new ClipboardService({
      selectionStoreService: this.selectionStoreService,
      columnService: this.columnService,
      dataStore: this.dataStore,
      onRangeApply: (d, r) => this.autoFillService.onRangeApply(d, r),
      internalCopy: () => this.internalCopy.emit()
    });
  }

  connectedCallback() {
    this.columnServiceSet();
    this.selectionServiceSet(this.selectionStore);
  }

  disconnectedCallback() {
    this.columnService?.destroy();
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore = [];
  }

  private renderRange(range: Selection.RangeArea) {
    const style = getElStyle(range, this.dimensionRow.state, this.dimensionCol.state);
    return [<div class={SELECTION_BORDER_CLASS} style={style} />];
  }

  private renderEditCell() {
    // if can edit
    const editCell = this.selectionStore.get('edit');
    if (this.readonly || !editCell) {
      return;
    }
    const val = editCell.val || this.columnService.getCellData(editCell.y, editCell.x);
    const editable = {
      ...editCell,
      ...this.columnService.getSaveData(editCell.y, editCell.x, val),
    };

    const style = getElStyle({ ...editCell, x1: editCell.x, y1: editCell.y }, this.dimensionRow.state, this.dimensionCol.state);
    return (
      <revogr-edit
        onCellEdit={e => this.onCellEdit(e.detail)}
        onCloseEdit={e => this.closeEdit(e)}
        editCell={editable}
        column={this.columnService.columns[editCell.x]}
        editor={this.columnService.getCellEditor(editCell.y, editCell.x, this.editors)}
        style={style}
      />
    );
  }

  render() {
    const range = this.selectionStoreService.ranged;
    const selectionFocus = this.selectionStoreService.focused;
    const els: VNode[] = [];
    if ((range || selectionFocus) && this.useClipboard) {
      els.push(this.clipboardService.renderClipboard());
    }

    if (range) {
      els.push(...this.renderRange(range));
    }

    const editCell = this.renderEditCell();
    if (editCell) {
      els.push(editCell);
    }
    if (selectionFocus && !this.readonly && !editCell && this.range) {
      els.push(this.autoFillService.renderAutofill(range, selectionFocus));
    }

    if (this.canDrag) {
      els.push(
        <revogr-order-editor
          ref={e => (this.orderEditor = e)}
          dataStore={this.dataStore}
          dimensionRow={this.dimensionRow}
          dimensionCol={this.dimensionCol}
          parent={this.element}
          onInternalRowDragStart={e => this.onRowDragStart(e)}
        />,
      );
    }
    return (
      <Host onDblClick={() => this.doEdit()} onMouseDown={(e: MouseEvent) => this.onElementMouseDown(e)}>
        {els}
        <slot name="data" />
      </Host>
    );
  }

  protected onElementMouseDown(e: MouseEvent) {
    // Ignore focus if clicked input
    if (isEditInput(e.target as HTMLElement | undefined)) {
      return;
    }
    const data = this.getData();
    if (e.defaultPrevented) {
      return;
    }
    // Regular cell click
    const focusCell = getCurrentCell({ x: e.x, y: e.y }, data);
    this.selectionStoreService.focus(focusCell, this.range && e.shiftKey);

    // Initiate autofill selection
    if (this.range) {
      this.autoFillService.selectionStart(e, data);
    }
  }

  protected doEdit(val = '') {
    if (this.canEdit()) {
      const editCell = this.selectionStore.get('focus');
      const data = this.columnService.getSaveData(editCell.y, editCell.x);
      this.setEdit?.emit({
        ...data,
        val,
      });
    }
  }

  /**
   * Close editor event triggered
   * @param details - if requires focus next
   */
  private closeEdit(e?: CustomEvent<boolean>) {
    this.cancelEdit.emit();
    if (e?.detail) {
      this.focusNext();
    }
  }

  private async focusNext() {
    const canFocus = await this.keyboardService.keyChangeSelection(
      new KeyboardEvent('keydown', {
        code: codesLetter.ARROW_DOWN,
      }),
      this.range
    );
    if (!canFocus) {
      this.closeEdit();
    }
  }

  protected clearCell() {
    if (this.selectionStoreService.ranged && !isRangeSingleCell(this.selectionStoreService.ranged)) {
      const data = this.columnService.getRangeStaticData(this.selectionStoreService.ranged, '');
      this.autoFillService.onRangeApply(data, this.selectionStoreService.ranged);
    } else if (this.canEdit()) {
      const focused = this.selectionStoreService.focused;
      this.onCellEdit({ rgRow: focused.y, rgCol: focused.x, val: '' }, true);
    }
  }

  /** Edit finished, close cell and save */
  protected onCellEdit(e: Edition.SaveDataDetails, clear = false) {
    const dataToSave = this.columnService.getSaveData(e.rgRow, e.rgCol, e.val);
    this.internalCellEdit.emit(dataToSave);
    // if not clear navigate to next cell after edit
    if (!clear && !e.preventFocus) {
      this.focusNext();
    }
  }

  private onRowDragStart({ detail }: CustomEvent<{ cell: Selection.Cell; text: string }>) {
    detail.text = this.columnService.getCellData(detail.cell.y, detail.cell.x);
  }

  /** Check if edit possible */
  protected canEdit() {
    if (this.readonly) {
      return false;
    }
    const editCell = this.selectionStoreService.focused;
    return editCell && !this.columnService?.isReadOnly(editCell.y, editCell.x);
  }

  /** Collect data from element */
  protected getData() {
    return {
      el: this.element,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
      lastCell: this.lastCell,
      focus: this.selectionStore.get('focus'),
      range: this.selectionStore.get('range'),
      edit: this.selectionStore.get('edit'),
    };
  }
}
