import { Component, Event, EventEmitter, h, Host, Listen, Prop, VNode, Element, Watch } from '@stencil/core';

import { AllDimensionType, ApplyFocusEvent, FocusRenderEvent, Edition, Observable, RevoGrid, Selection } from '../../interfaces';
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
  @Event({ cancelable: true }) beforeFocusCell: EventEmitter<Edition.BeforeSaveDataDetails>;

  @Event({ bubbles: false }) setEdit: EventEmitter<Edition.BeforeEdit>;
  @Event({ eventName: 'before-apply-range' }) beforeApplyRange: EventEmitter<FocusRenderEvent>;
  @Event({ eventName: 'before-set-range' }) beforeSetRange: EventEmitter;
  @Event({ eventName: 'before-edit-render' }) beforeEditRender: EventEmitter<FocusRenderEvent>;
  @Event() setRange: EventEmitter<Selection.RangeArea & { type: RevoGrid.MultiDimensionType }>;
  @Event() setTempRange: EventEmitter<Selection.TempRange | null>;

  @Event() applyFocus: EventEmitter<FocusRenderEvent>;
  @Event() focusCell: EventEmitter<ApplyFocusEvent>;
  /** Range data apply */
  @Event() beforeRangeDataApply: EventEmitter<FocusRenderEvent>;
  /** Selection range changed */
  @Event({ cancelable: true }) internalSelectionChanged: EventEmitter<Selection.ChangedRange>;

  /** Range data apply */
  @Event({ cancelable: true }) internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;

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

  /** Get keyboard down from element */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    this.keyboardService?.keyUp(e);
  }

  /** Get keyboard down from element */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    this.keyboardService?.keyDown(e, this.range);
  }

  /** Create selection store */
  @Watch('selectionStore') selectionServiceSet(s: Observable<Selection.SelectionStoreState>) {
    this.selectionStoreService = new SelectionStoreService(s, {
      changeRange: range => this.triggerRangeEvent(range),
      focus: (focus, end) => this.doFocus(focus, end),
    });

    this.keyboardService = new KeyboardService({
      selectionStoreService: this.selectionStoreService,
      selectionStore: s,
      range: (r) => this.selectionStoreService.changeRange(r),
      focusNext: (f, next) => this.doFocus(f, f, next),
      doEdit: (v, c) => !this.readonly && this.doEdit(v, c),
      clearCell: () => !this.readonly && this.clearCell(),
      internalPaste: () => !this.readonly && this.internalPaste.emit(),
      getData: () => this.getData(),
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

      beforeRangeDataApply: e => this.beforeRangeDataApply.emit({
        ...e,
        ...this.types
      }),
      setTempRange: e => this.setTempRange.emit(e),
      internalSelectionChanged: e => this.internalSelectionChanged.emit(e),
      internalRangeDataApply: e => this.internalRangeDataApply.emit(e),
      setRange: e => this.triggerRangeEvent(e),
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
      internalCopy: () => this.internalCopy.emit(),
    });
  }

  connectedCallback() {
    this.columnServiceSet();
    this.selectionServiceSet(this.selectionStore);
  }

  disconnectedCallback() {
    this.columnService?.destroy();
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
    const renderEvent = this.beforeEditRender.emit({
      range: {
        ...editCell,
        x1: editCell.x,
        y1: editCell.y,
      },
      ...this.types
    });
    if (renderEvent.defaultPrevented) {
      return;
    }
    
    const { detail: { range } } = renderEvent;
    const style = getElStyle(range, this.dimensionRow.state, this.dimensionCol.state);
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
    const editCell = this.renderEditCell();
    if ((range || selectionFocus)&& !editCell && this.useClipboard) {
      els.push(this.clipboardService.renderClipboard());
    }

    if (range) {
      els.push(...this.renderRange(range));
    }

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

  private doFocus(focus: Selection.Cell, end: Selection.Cell, next?: Partial<Selection.Cell>) {
    const { defaultPrevented } = this.beforeFocusCell.emit(this.columnService.getSaveData(focus.y, focus.x));
    if (defaultPrevented) {
      return false;
    }
    const evData = {
      range: {
        ...focus,
        x1: end.x,
        y1: end.y
      },
      next,
      ...this.types
    };
    const applyEvent = this.applyFocus.emit(evData);
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const { range } = applyEvent.detail;
    return !this.focusCell.emit({
      focus: {
        x: range.x,
        y: range.y,
      },
      end: {
        x: range.x1,
        y: range.y1,
      },
      ...applyEvent.detail
    }).defaultPrevented;
  }

  private triggerRangeEvent(range: Selection.RangeArea) {
    const type = this.types.rowType;
    const applyEvent = this.beforeApplyRange.emit({
      range: { ...range },
      ...this.types
    });
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const data = this.columnService.getRangeTransformedToProps(applyEvent.detail.range, this.dataStore);
    let e = this.beforeSetRange.emit(data);
    e = this.setRange.emit({ ...applyEvent.detail.range, type });
    if (e.defaultPrevented) {
      return false;
    }
    return !e.defaultPrevented;
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

  protected doEdit(val = '', isCancel = false) {
    if (this.canEdit()) {
      const editCell = this.selectionStore.get('focus');
      const data = this.columnService.getSaveData(editCell.y, editCell.x);
      this.setEdit?.emit({
        ...data,
        isCancel,
        val,
      });
    }
  }

  private closeEdit(e?: CustomEvent<boolean>) {
    this.doEdit(undefined, true);
    if (e?.detail) {
      this.focusNext();
    }
  }

  private async focusNext() {
    const canFocus = await this.keyboardService.keyChangeSelection(
      new KeyboardEvent('keydown', {
        code: codesLetter.ARROW_DOWN,
      }),
      this.range,
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

  get types(): AllDimensionType {
    return {
      rowType: this.dataStore.get('type'),
      colType: this.columnService.type
    };
  }

  /** Collect data from element */
  protected getData() {
    return {
      el: this.element,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
      lastCell: this.lastCell,
    };
  }
}
