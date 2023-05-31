import { Component, Event, EventEmitter, h, Host, Listen, Prop, VNode, Element, Watch } from '@stencil/core';

import { AllDimensionType, ApplyFocusEvent, FocusRenderEvent, Edition, Observable, RevoGrid, Selection, DragStartEvent } from '../../interfaces';
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
import { getFromEvent } from '../../utils/events';

@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss',
})
export class OverlaySelection {

  @Element() element: HTMLElement;

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  /**
   * If readonly mode enables
   */
  @Prop() readonly: boolean;
  /**
   * Range selection mode
   */
  @Prop() range: boolean;
  /**
   * Enable revogr-order-editor component (read more in revogr-order-editor component)
   * Allows D&D
   */
  @Prop() canDrag: boolean;

  /**
   * Enable revogr-clipboard component (read more in revogr-clipboard component)
   * Allows copy/paste
   */
  @Prop() useClipboard: boolean;

  // --------------------------------------------------------------------------
  //
  //  Dynamic stores
  //
  // --------------------------------------------------------------------------
  @Prop() selectionStore: Observable<Selection.SelectionStoreState>;
  @Prop() dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol: Observable<RevoGrid.DimensionSettingsState>;

  // --------------------------------------------------------------------------
  //
  //  Static stores, not expected to change during component lifetime
  //
  // --------------------------------------------------------------------------

  /**
   * Row data store
   */
  @Prop() dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  /**
   * Column data store
   */
  @Prop() colData: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
  /**
   * Last cell position
   */
  @Prop() lastCell: Selection.Cell;
  /**
   * Custom editors register
   */
  @Prop() editors: Edition.Editors;
  /** If true applys changes when cell closes if not Escape */
  @Prop() applyChangesOnClose: boolean = false;
  /** Additional data to pass to renderer */
  @Prop() additionalData: any;

  // --------------------------------------------------------------------------
  //
  //  Events
  //
  // --------------------------------------------------------------------------

  /**
   * Before clipboard copy happened
   */
  @Event({ cancelable: true }) internalCopy: EventEmitter;
  /**
   * Before paste happened
   */
  @Event({ cancelable: true }) internalPaste: EventEmitter;

  @Event({ cancelable: true }) internalCellEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Event({ cancelable: true }) beforeFocusCell: EventEmitter<Edition.BeforeSaveDataDetails>;

  /**
   * Set edit cell
   */
  @Event() setEdit: EventEmitter<Edition.BeforeEdit>;
  @Event({ eventName: 'before-apply-range' }) beforeApplyRange: EventEmitter<FocusRenderEvent>;
  @Event({ eventName: 'before-set-range' }) beforeSetRange: EventEmitter;
  @Event({ eventName: 'before-edit-render' }) beforeEditRender: EventEmitter<FocusRenderEvent>;
  @Event() setRange: EventEmitter<Selection.RangeArea & { type: RevoGrid.MultiDimensionType }>;
  @Event({ eventName: 'selectall' }) selectAll: EventEmitter;
  /**
   * Used for editors support when close requested
   */
  @Event() cancelEdit: EventEmitter;
  @Event() setTempRange: EventEmitter<Selection.TempRange | null>;

  @Event() applyFocus: EventEmitter<FocusRenderEvent>;
  @Event() focusCell: EventEmitter<ApplyFocusEvent>;
  /** Range data apply */
  @Event() beforeRangeDataApply: EventEmitter<FocusRenderEvent>;
  /** Selection range changed */
  @Event({ cancelable: true }) internalSelectionChanged: EventEmitter<Selection.ChangedRange>;
  /** Selection range changed */
  @Event({ cancelable: true, bubbles: true }) beforeRangeCopyApply: EventEmitter<Selection.ChangedRange>;

  /** Range data apply */
  @Event({ cancelable: true }) internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;
  /** Range copy */
  @Event({ cancelable: true }) rangeClipboardCopy: EventEmitter;
  @Event({ cancelable: true }) rangeClipboardPaste: EventEmitter;

  protected columnService: ColumnService;

  protected selectionStoreService: SelectionStoreService;
  private keyboardService: KeyboardService | null = null;
  private autoFillService: AutoFillService | null = null;
  private clipboardService: ClipboardService | null = null;
  private orderEditor: HTMLRevogrOrderEditorElement;
  private revogrEdit: HTMLRevogrEditElement | null = null;
  /**
   * Runs before cell save
   * Can be used to override or cancel original save
   */
  @Event({ eventName: 'before-cell-save', cancelable: true }) beforeCellSave: EventEmitter;
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------
  @Listen('touchmove', { target: 'document' })
  @Listen('mousemove', { target: 'document' })
  onMouseMove(e: MouseEvent | TouchEvent) {
    if (this.selectionStoreService.focused) {
      this.autoFillService.selectionMouseMove(e);
    }
  }


  /** Action finished inside of the document */
  /** Pointer left document, clear any active operation */
  @Listen('touchend', { target: 'document' })
  @Listen('mouseup', { target: 'document' })
  @Listen('mouseleave', { target: 'document' })
  onMouseUp() {
    this.autoFillService.clearAutoFillSelection();
  }

  /** Row drag started */
  @Listen('dragStartCell') onCellDrag(e: CustomEvent<DragStartEvent>) {
    this.orderEditor?.dragStart(e.detail);
  }

  /** Get keyboard down from element */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    this.keyboardService?.keyUp(e);
  }

  /** Get keyboard down from element */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented) {
      return;
    }
    this.keyboardService?.keyDown(e, this.range);
  }

  // selection & keyboard
  @Watch('selectionStore') selectionServiceSet(s: Observable<Selection.SelectionStoreState>) {
    this.selectionStoreService = new SelectionStoreService(s, {
      changeRange: range => this.triggerRangeEvent(range),
      focus: (focus, end) => this.doFocus(focus, end),
    });

    this.keyboardService = new KeyboardService({
      selectionStoreService: this.selectionStoreService,
      selectionStore: s,
      range: r => this.selectionStoreService.changeRange(r),
      focusNext: (f, next) => this.doFocus(f, f, next),
      applyEdit: val => {
        if (this.readonly) {
          return;
        }
        this.doEdit(val);
      },
      cancelEdit: async () => {
        await this.revogrEdit.cancel();
        this.closeEdit();
      },
      clearCell: () => !this.readonly && this.clearCell(),
      internalPaste: () => !this.readonly && this.internalPaste.emit(),
      getData: () => this.getData(),
      selectAll: () => this.selectAll.emit(),
    });
    this.createAutoFillService();
    this.createClipboardService();
  }
  // autofill
  @Watch('dimensionRow')
  @Watch('dimensionCol')
  createAutoFillService() {
    this.autoFillService = new AutoFillService({
      selectionStoreService: this.selectionStoreService,
      dimensionRow: this.dimensionRow,
      dimensionCol: this.dimensionCol,
      columnService: this.columnService,
      dataStore: this.dataStore,

      clearRangeDataApply: e =>
        this.beforeRangeDataApply.emit({
          ...e,
          ...this.types,
        }),
      setTempRange: e => this.setTempRange.emit(e),
      selectionChanged: e => this.internalSelectionChanged.emit(e),
      rangeCopy: e => this.beforeRangeCopyApply.emit(e),
      rangeDataApply: e => this.internalRangeDataApply.emit(e),

      setRange: e => this.triggerRangeEvent(e),
      getData: () => this.getData(),
    });
  }

  // columns
  @Watch('dataStore')
  @Watch('colData')
  columnServiceSet() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.createAutoFillService();
    this.createClipboardService();
  }

  // clipboard
  createClipboardService() {
    this.clipboardService = new ClipboardService({
      selectionStoreService: this.selectionStoreService,
      columnService: this.columnService,
      dataStore: this.dataStore,
      rangeApply: (d, r) => this.autoFillService.onRangeApply(d, r),
      rangeCopy: range => {
        if (!range) {
          return undefined;
        }
        const { data, mapping } = this.columnService.copyRangeArray(range, this.dataStore);
        const event = this.rangeClipboardCopy.emit({
          range,
          data,
          mapping,
          ...this.types,
        });
        if (event.defaultPrevented) {
          return undefined;
        }
        return event.detail.data;
      },
      rangeClear: () => !this.readonly && this.clearCell(),
      beforeCopy: range => this.internalCopy.emit(range),
      beforePaste: (data, range) => {
        return this.rangeClipboardPaste.emit({
          data,
          range,
          ...this.types,
        });
      },
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
      return null;
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
      ...this.types,
    });
    if (renderEvent.defaultPrevented) {
      return null;
    }

    const {
      detail: { range },
    } = renderEvent;
    const style = getElStyle(range, this.dimensionRow.state, this.dimensionCol.state);
    return (
      <revogr-edit
        ref={el => {
          this.revogrEdit = el;
        }}
        onCellEdit={e => {
          const saveEv = this.beforeCellSave.emit(e.detail);
          if (!saveEv.defaultPrevented) {
            this.cellEdit(saveEv.detail);
          }

          // if not clear navigate to next cell after edit
          if (!saveEv.detail.preventFocus) {
            this.focusNext();
          }
        }}
        onCloseEdit={e => this.closeEdit(e)}
        editCell={editable}
        saveOnClose={this.applyChangesOnClose}
        column={this.columnService.columns[editCell.x]}
        editor={this.columnService.getCellEditor(editCell.y, editCell.x, this.editors)}
        additionalData={this.additionalData}
        style={style}
      />
    );
  }

  render() {
    const els: VNode[] = [];
    const editCell = this.renderEditCell();
    if (editCell) {
      els.push(editCell);
    } else {
      const range = this.selectionStoreService.ranged;
      const selectionFocus = this.selectionStoreService.focused;
      if ((range || selectionFocus) && this.useClipboard) {
        els.push(this.clipboardService.renderClipboard(this.readonly));
      }

      if (range) {
        els.push(...this.renderRange(range));
      }
      if (selectionFocus && !this.readonly && this.range) {
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
    }
    return (
      <Host
        // run edit on dblclick
        onDblClick={(e: MouseEvent) => {
          // if dblclick prevented outside edit will not start
          if (!e.defaultPrevented) {
            this.doEdit();
          }
        }}
        onMouseDown={(e: MouseEvent) => this.onElementMouseDown(e)}
        onTouchStart={(e: TouchEvent) => this.onElementMouseDown(e)}>
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
        y1: end.y,
      },
      next,
      ...this.types,
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
      ...applyEvent.detail,
    }).defaultPrevented;
  }

  private triggerRangeEvent(range: Selection.RangeArea) {
    const type = this.types.rowType;
    const applyEvent = this.beforeApplyRange.emit({
      range: { ...range },
      ...this.types,
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

  protected onElementMouseDown(e: MouseEvent | TouchEvent) {
    // Ignore focus if clicked input
    if (isEditInput(e.target as HTMLElement | undefined)) {
      return;
    }
    const data = this.getData();
    if (e.defaultPrevented) {
      return;
    }
    // Regular cell click
    const focusCell = getCurrentCell({ x: getFromEvent(e, 'clientX'), y: getFromEvent(e, 'clientY') }, data);
    this.selectionStoreService.focus(focusCell, this.range && e.shiftKey);

    // Initiate autofill selection
    if (this.range) {
      this.autoFillService.selectionStart(e.target as HTMLElement, data);
      e.preventDefault();
    }
  }

  /** 
   * Start cell editing
   */
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

  /** Edit finished, close cell and save */
  protected cellEdit(e: Edition.SaveDataDetails) {
    const dataToSave = this.columnService.getSaveData(e.rgRow, e.rgCol, e.val);
    this.internalCellEdit.emit(dataToSave);
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
      const cell = this.columnService.getSaveData(focused.y, focused.x);
      this.cellEdit({
        rgRow: focused.y,
        rgCol: focused.x,
        val: '',
        type: cell.type,
        prop: cell.prop,
      });
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
      colType: this.columnService.type,
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
