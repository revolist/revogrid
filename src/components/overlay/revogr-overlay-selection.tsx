import {
  Component,
  Event,
  EventEmitter,
  h,
  Host,
  Listen,
  Prop,
  type VNode,
  Element,
  Watch,
} from '@stencil/core';
import ColumnService, { getCellEditor } from '../data/column.service';
import { codesLetter } from '../../utils/key.codes';
import { MOBILE_CLASS, SELECTION_BORDER_CLASS } from '../../utils/consts';
import { type DSourceState, getRange, isRangeSingleCell } from '@store';
import {
  collectModelsOfRange,
  EventData,
  getCell,
  getFocusCellBasedOnEvent,
  styleByCellProps,
} from './selection.utils';
import { isEditInput } from '../editors/edit.utils';
import { KeyboardService } from './keyboard.service';
import { AutoFillService } from './autofill.service';
import { verifyTouchTarget } from '../../utils/events';
import { getCellData, type Observable } from '../../utils';

import type {
  SelectionStoreState,
  DimensionSettingsState,
  DataType,
  DimensionRows,
  ColumnRegular,
  DimensionCols,
  DragStartEvent,
  Cell,
  MultiDimensionType,
  Nullable,
  RangeClipboardCopyEventProps,
  RangeClipboardPasteEvent,
  FocusRenderEvent,
  ApplyFocusEvent,
  AllDimensionType,
  DataFormat,
  Editors,
  BeforeSaveDataDetails,
  BeforeEdit,
  RangeArea,
  TempRange,
  ChangedRange,
  BeforeRangeSaveDataDetails,
  SaveDataDetails,
  EditCellStore,
} from '@type';

/**
 * Component for overlaying the grid with the selection.
 */
@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss',
})
export class OverlaySelection {
  // #region Properties
  /**
   * Readonly mode.
   */
  @Prop() readonly: boolean;
  /**
   * Range selection allowed.
   */
  @Prop() range: boolean;
  /**
   * Enable revogr-order-editor component (read more in revogr-order-editor component).
   * Allows D&D.
   */
  @Prop() canDrag: boolean;

  /**
   * Enable revogr-clipboard component (read more in revogr-clipboard component).
   * Allows copy/paste.
   */
  @Prop() useClipboard: boolean;

  /** Stores */
  /** Selection, range, focus. */
  @Prop() selectionStore!: Observable<SelectionStoreState>;
  /** Dimension settings Y. */
  @Prop() dimensionRow: Observable<DimensionSettingsState>;
  /** Dimension settings X. */
  @Prop() dimensionCol!: Observable<DimensionSettingsState>;

  // --------------------------------------------------------------------------
  //
  //  Static stores, not expected to change during component lifetime
  //
  // --------------------------------------------------------------------------

  /**
   * Row data store.
   */
  @Prop() dataStore!: Observable<DSourceState<DataType, DimensionRows>>;

  /**
   * Column data store.
   */
  @Prop() colData!: Observable<DSourceState<ColumnRegular, DimensionCols>>;
  /**
   * Last real coordinates positions + 1.
   */
  @Prop() lastCell: Cell;
  /**
   * Custom editors register.
   */
  @Prop() editors: Editors;
  /**
   * If true applys changes when cell closes if not Escape.
   */
  @Prop() applyChangesOnClose = false;
  /**
   * Additional data to pass to renderer.
   */
  @Prop() additionalData: any;

  /**
   * Is mobile view mode.
   */
  @Prop() isMobileDevice: boolean;

  // #endregion

  // #region Events
  /**
   * Before clipboard copy happened. Validate data before copy.
   * To prevent the default behavior of editing data and use your own implementation, call `e.preventDefault()`.
   */
  @Event({ eventName: 'beforecopyregion', cancelable: true })
  beforeCopyRegion: EventEmitter;
  /**
   * Before region paste happened.
   */
  @Event({ eventName: 'beforepasteregion', cancelable: true })
  beforeRegionPaste: EventEmitter;

  /**
   * Cell edit apply to the data source.
   * Triggers datasource edit on the root level.
   */
  @Event({ eventName: 'celleditapply', cancelable: true })
  cellEditApply: EventEmitter<BeforeSaveDataDetails>;

  /**
   * Before cell focus.
   */
  @Event({ eventName: 'beforecellfocusinit', cancelable: true })
  beforeFocusCell: EventEmitter<BeforeSaveDataDetails>;

  /**
   * Fired when change of viewport happens.
   * Usually when we switch between pinned regions.
   */
  @Event({ eventName: 'beforenextvpfocus', cancelable: true })
  beforeNextViewportFocus: EventEmitter<Cell>;

  /**
   * Set edit cell.
   */
  @Event({ eventName: 'setedit' }) setEdit: EventEmitter<BeforeEdit>;

  /**
   * Before range applied.
   * First step in triggerRangeEvent.
   */
  @Event({ eventName: 'beforeapplyrange' })
  beforeApplyRange: EventEmitter<FocusRenderEvent>;
  /**
   * Before range selection applied.
   * Second step in triggerRangeEvent.
   */
  @Event({ eventName: 'beforesetrange' }) beforeSetRange: EventEmitter;

  /**
   * Set range.
   * Third step in triggerRangeEvent.
   */
  @Event({ eventName: 'setrange' }) setRange: EventEmitter<
    RangeArea & { type: MultiDimensionType }
  >;

  /**
   * Before editor render.
   */
  @Event({ eventName: 'beforeeditrender' })
  beforeEditRender: EventEmitter<FocusRenderEvent>;


  /** Select all cells from keyboard. */
  @Event({ eventName: 'selectall' }) selectAll: EventEmitter;
  /**
   * Cancel edit. Used for editors support when editor close requested.
   */
  @Event({ eventName: 'canceledit' }) cancelEdit: EventEmitter;

  /**
   * Set temp range area during autofill.
   */
  @Event({ eventName: 'settemprange' })
  setTempRange: EventEmitter<Nullable<TempRange> | null>;

  /**
   * Before set temp range area during autofill.
   */
  @Event({ eventName: 'beforesettemprange' })
  beforeSetTempRange: EventEmitter<
    { tempRange: Nullable<TempRange> | null } & EventData & AllDimensionType
  >;

  /**
   * Before cell get focused.
   * To prevent the default behavior of applying the edit data, you can call `e.preventDefault()`.
   */
  @Event({ eventName: 'applyfocus' })
  applyFocus: EventEmitter<FocusRenderEvent>;

  /**
   * Cell get focused.
   * To prevent the default behavior of applying the edit data, you can call `e.preventDefault()`.
   */
  @Event({ eventName: 'focuscell' }) focusCell: EventEmitter<ApplyFocusEvent & FocusRenderEvent>;
  /** Range data apply. */
  @Event({ eventName: 'beforerangedataapply' })
  beforeRangeDataApply: EventEmitter<FocusRenderEvent>;
  /** Autofill data in range. First step in applyRangeWithData */
  @Event({ eventName: 'selectionchangeinit', cancelable: true })
  selectionChange: EventEmitter<ChangedRange>;
  /** Before range copy. */
  @Event({ eventName: 'beforerangecopyapply', cancelable: true, bubbles: true })
  beforeRangeCopyApply: EventEmitter<ChangedRange>;

  /** Range data apply.
   * Triggers datasource edit on the root level.
   */
  @Event({ eventName: 'rangeeditapply', cancelable: true })
  rangeEditApply: EventEmitter<BeforeRangeSaveDataDetails>;
  /** Range copy. */
  @Event({ eventName: 'clipboardrangecopy', cancelable: true })
  /**
   * Range copy event.
   * This event is triggered when data is ready to be copied to the clipboard.
   * If you want to prevent the default behavior of copying data, you can call `e.preventDefault()`.
   * If you want to modify the data that will be copied to the clipboard, modify the `data` property of the event object.
   */
  rangeClipboardCopy: EventEmitter<RangeClipboardCopyEventProps>;

  /**
   * Range paste event.
   */
  @Event({ eventName: 'clipboardrangepaste', cancelable: true })
  rangeClipboardPaste: EventEmitter<RangeClipboardPasteEvent>;

  /**
   * Before key up event proxy, used to prevent key up trigger.
   * If you have some custom behaviour event, use this event to check if it wasn't processed by internal logic.
   * Call preventDefault().
   */
  @Event({ eventName: 'beforekeydown' })
  beforeKeyDown: EventEmitter<{ original: KeyboardEvent } & EventData>;
  /**
   * Before key down event proxy, used to prevent key down trigger.
   * If you have some custom behaviour event, use this event to check if it wasn't processed by internal logic.
   * Call preventDefault().
   */
  @Event({ eventName: 'beforekeyup' }) beforeKeyUp: EventEmitter<
    { original: KeyboardEvent } & EventData
  >;
  /**
   * Runs before cell save.
   * Can be used to override or cancel original save.
   */
  @Event({ eventName: 'beforecellsave', cancelable: true })
  beforeCellSave: EventEmitter;

  // #endregion

  // #region Private Properties
  @Element() element: HTMLElement;
  private clipboard?: HTMLRevogrClipboardElement;

  protected columnService: ColumnService;
  private keyboardService: KeyboardService | null = null;
  private autoFillService: AutoFillService | null = null;
  private orderEditor?: HTMLRevogrOrderEditorElement;
  private revogrEdit?: HTMLRevogrEditElement;
  private unsubscribeSelectionStore: { (): void }[] = [];
  // #endregion

  // #region Listeners
  @Listen('touchmove', { target: 'document' })
  @Listen('mousemove', { target: 'document' })
  onMouseMove(e: MouseEvent | TouchEvent) {
    if (this.selectionStore.get('focus')) {
      this.autoFillService?.selectionMouseMove(e);
    }
  }

  /**
   * Action finished inside the document.
   * Pointer left document, clear any active operation.
   */
  @Listen('touchend', { target: 'document' })
  @Listen('mouseup', { target: 'document' })
  @Listen('mouseleave', { target: 'document' })
  onMouseUp() {
    // Clear autofill selection
    // when pointer left document,
    // clear any active operation.
    this.autoFillService?.clearAutoFillSelection(
      this.selectionStore.get('focus'),
      this.selectionStore.get('range'),
    );
  }

  /**
   * Row drag started.
   * This event is fired when drag action started on cell.
   */
  @Listen('dragstartcell') onCellDrag(e: CustomEvent<DragStartEvent>) {
    // Invoke drag start on order editor.
    this.orderEditor?.dragStart(e.detail);
  }

  /**
   * Get keyboard down from element.
   * This event is fired when keyboard key is released.
   */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    // Emit before key up event.
    this.beforeKeyUp.emit({ original: e, ...this.getData() });
  }

  /**
   * Get keyboard down from element.
   * This event is fired when keyboard key is pressed.
   */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    // Emit before key down event and check if default prevention is set.
    const proxy = this.beforeKeyDown.emit({ original: e, ...this.getData() });
    if (e.defaultPrevented || proxy.defaultPrevented) {
      return;
    }
    // Invoke key down on keyboard service.
    this.keyboardService?.keyDown(
      e,
      this.range,
      !!this.selectionStore.get('edit'),
      {
        focus: this.selectionStore.get('focus'),
        range: this.selectionStore.get('range'),
      },
    );
  }
  // #endregion

  /**
   * Selection & Keyboard
   */
  @Watch('selectionStore') selectionServiceSet(
    selectionStore: Observable<SelectionStoreState>,
  ) {
    // clear subscriptions
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore.length = 0;
    this.unsubscribeSelectionStore.push(
      selectionStore.onChange('nextFocus', v => v && this.doFocus(v, v)),
    );

    this.keyboardService = new KeyboardService({
      selectionStore,
      range: r => !!r && this.triggerRangeEvent(r),
      focus: (f, changes, focusNextViewport) => {
        if (focusNextViewport) {
          this.beforeNextViewportFocus.emit(f);
          return false;
        } else {
          return this.doFocus(f, f, changes);
        }
      },
      change: val => {
        if (this.readonly) {
          return;
        }
        this.doEdit(val);
      },
      cancel: async () => {
        await this.revogrEdit?.cancelChanges();
        this.closeEdit();
      },
      clearCell: () => !this.readonly && this.clearCell(),
      internalPaste: () => !this.readonly && this.beforeRegionPaste.emit(),
      getData: () => this.getData(),
      selectAll: () => this.selectAll.emit(),
    });
    this.createAutoFillService();
  }
  /** Autofill */
  @Watch('dimensionRow')
  @Watch('dimensionCol')
  createAutoFillService() {
    this.autoFillService = new AutoFillService({
      dimensionRow: this.dimensionRow,
      dimensionCol: this.dimensionCol,
      columnService: this.columnService,
      dataStore: this.dataStore,

      clearRangeDataApply: e =>
        this.beforeRangeDataApply.emit({
          ...e,
          ...this.types,
          rowDimension: { ...this.dimensionRow.state },
          colDimension: { ...this.dimensionCol.state },
        }),
      setTempRange: e => {
        const tempRangeEvent = this.beforeSetTempRange.emit({
          tempRange: e,
          ...this.getData(),
          ...this.types,
        });
        if (tempRangeEvent.defaultPrevented) {
          return null;
        }
        return this.setTempRange.emit(tempRangeEvent.detail.tempRange);
      },
      selectionChanged: e => this.selectionChange.emit(e),

      rangeCopy: e => this.beforeRangeCopyApply.emit(e),
      rangeDataApply: e => this.rangeEditApply.emit(e),

      setRange: e => !!e && this.triggerRangeEvent(e),
      getData: () => this.getData(),
    });
  }

  /** Columns */
  @Watch('dataStore')
  @Watch('colData')
  columnServiceSet() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.createAutoFillService();
  }

  connectedCallback() {
    this.columnServiceSet();
    this.selectionServiceSet(this.selectionStore);
  }

  disconnectedCallback() {
    // clear subscriptions
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore.length = 0;
    this.columnService?.destroy();
  }

  async componentWillRender() {
    const editCell = this.selectionStore.get('edit');
    if (!editCell) {
      await this.revogrEdit?.beforeDisconnect?.();
    }
  }

  private renderRange(range: RangeArea) {
    const cell = getCell(
      range,
      this.dimensionRow.state,
      this.dimensionCol.state,
    );
    const styles = styleByCellProps(cell);
    return [
      <div class={SELECTION_BORDER_CLASS} style={styles}>
        {this.isMobileDevice && (
          <div class="range-handlers">
            <span class={MOBILE_CLASS}></span>
            <span class={MOBILE_CLASS}></span>
          </div>
        )}
      </div>,
    ];
  }

  private renderEditor() {
    // Check if edit access
    const editCell = this.selectionStore.get('edit');
    // Readonly or Editor closed
    if (this.readonly || !editCell) {
      return null;
    }
    const enteredOrModelValue =
      editCell.val ||
        getCellData(
          this.columnService.rowDataModel(editCell.y, editCell.x).value
        );
    const editable = {
      ...editCell,
      ...this.columnService.getSaveData(
        editCell.y,
        editCell.x,
        enteredOrModelValue,
      ),
    };
    const renderEvent = this.beforeEditRender.emit({
      range: {
        ...editCell,
        x1: editCell.x,
        y1: editCell.y,
      },
      ...this.types,
      rowDimension: { ...this.dimensionRow.state },
      colDimension: { ...this.dimensionCol.state },
    });

    // Render prevented
    if (renderEvent.defaultPrevented) {
      return null;
    }

    const cell = getCell(
      renderEvent.detail.range,
      renderEvent.detail.rowDimension,
      renderEvent.detail.colDimension,
    );
    const styles = styleByCellProps(cell);
    return (
      <revogr-edit
        style={styles}
        ref={el => (this.revogrEdit = el)}
        additionalData={this.additionalData}
        editCell={editable}
        saveOnClose={this.applyChangesOnClose}
        column={this.columnService.rowDataModel(editCell.y, editCell.x)}
        editor={getCellEditor(
          this.columnService.columns[editCell.x],
          this.editors,
        )}
      />
    );
  }

  render() {
    const nodes: VNode[] = [];
    const editCell = this.renderEditor();

    // Editor
    if (editCell) {
      nodes.push(editCell);
    } else {
      const range = this.selectionStore.get('range');
      const focus = this.selectionStore.get('focus');

      // Clipboard
      if ((range || focus) && this.useClipboard) {
        nodes.push(
          <revogr-clipboard
            readonly={this.readonly}
            onCopyregion={e => this.onCopy(e.detail)}
            onClearregion={() => !this.readonly && this.clearCell()}
            ref={e => (this.clipboard = e)}
            onPasteregion={e => this.onPaste(e.detail)}
          />,
        );
      }

      // Range
      if (range) {
        nodes.push(...this.renderRange(range));
      }
      // Autofill
      if (focus && !this.readonly && this.range) {
        nodes.push(this.autoFillService?.renderAutofill(range, focus));
      }

      // Order
      if (this.canDrag) {
        nodes.push(
          <revogr-order-editor
            ref={e => (this.orderEditor = e)}
            dataStore={this.dataStore}
            dimensionRow={this.dimensionRow}
            dimensionCol={this.dimensionCol}
            parent={this.element}
            rowType={this.types.rowType}
            onRowdragstartinit={e => this.rowDragStart(e)}
          />,
        );
      }
    }
    return (
      <Host
        class={{ mobile: this.isMobileDevice }}
        onDblClick={(e: MouseEvent) => this.onElementDblClick(e)}
        onMouseDown={(e: MouseEvent) => this.onElementMouseDown(e)}
        onTouchStart={(e: TouchEvent) => this.onElementMouseDown(e, true)}
        onCloseedit={(e: CustomEvent<boolean | undefined>) => this.closeEdit(e)}
        onCelledit={(e: CustomEvent<SaveDataDetails>) => {
          const saveEv = this.beforeCellSave.emit(e.detail);
          if (!saveEv.defaultPrevented) {
            this.cellEdit(saveEv.detail);
          }

          // if not clear navigate to next cell after edit
          if (!saveEv.detail.preventFocus) {
            this.focusNext();
          }
        }}
      >
        {nodes}
        <slot name="data" />
      </Host>
    );
  }

  /**
   * Executes the focus operation on the specified range of cells.
   */
  private doFocus(focus: Cell, end: Cell, changes?: Partial<Cell>) {
    // 1. Trigger beforeFocus event
    const { defaultPrevented } = this.beforeFocusCell.emit(
      this.columnService.getSaveData(focus.y, focus.x),
    );
    if (defaultPrevented) {
      return false;
    }
    const evData: FocusRenderEvent = {
      range: {
        ...focus,
        x1: end.x,
        y1: end.y,
      },
      next: changes,
      ...this.types,
      rowDimension: { ...this.dimensionRow.state },
      colDimension: { ...this.dimensionCol.state },
    };

    // 2. Trigger apply focus event
    const applyEvent = this.applyFocus.emit(evData);
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const { range } = applyEvent.detail;

    // 3. Trigger focus event
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

  private triggerRangeEvent(range: RangeArea) {
    const type = this.types.rowType;
    // 1. Apply range
    const applyEvent = this.beforeApplyRange.emit({
      range: { ...range },
      ...this.types,
      rowDimension: { ...this.dimensionRow.state },
      colDimension: { ...this.dimensionCol.state },
    });
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const data = this.columnService.getRangeTransformedToProps(
      applyEvent.detail.range,
      this.dataStore,
    );
    // 2. Before set range
    let e = this.beforeSetRange.emit(data);
    if (e.defaultPrevented) {
      return false;
    }
    // 3. Set range
    e = this.setRange.emit({ ...applyEvent.detail.range, type });
    if (e.defaultPrevented) {
      return false;
    }
    return !e.defaultPrevented;
  }

  /**
   * Open Editor on DblClick
   */
  private onElementDblClick(e: MouseEvent) {
    // DblClick prevented outside - Editor will not open
    if (e.defaultPrevented) {
      return;
    }

    // Get data from the component
    const data = this.getData();
    const focusCell = getFocusCellBasedOnEvent(e, data);
    if (!focusCell) {
      return;
    }
    this.doEdit();
  }

  /**
   * Handle mouse down event on Host element
   */
  private onElementMouseDown(e: MouseEvent | TouchEvent, touch = false) {
    // Get the target element from the event object
    const targetElement = e.target as HTMLElement | undefined;
    // Ignore focus if clicked input
    if (isEditInput(targetElement) || e.defaultPrevented) {
      return;
    }

    // Get data from the component
    const data = this.getData();
    const focusCell = getFocusCellBasedOnEvent(e, data);
    if (!focusCell) {
      return;
    }

    // Set focus on the current cell
    this.focus(focusCell, this.range && e.shiftKey);

    // Initiate autofill selection
    if (this.range) {
      targetElement &&
        this.autoFillService?.selectionStart(targetElement, this.getData());

      // Prevent default behavior for mouse events,
      // but only if target element is not a mobile input
      if (!touch) {
        e.preventDefault();
      } else if (
        verifyTouchTarget((e as TouchEvent).touches[0], MOBILE_CLASS)
      ) {
        // Prevent default behavior for touch events
        // if target element is a mobile input
        e.preventDefault();
      }
    }
  }

  /**
   * Start cell editing
   */
  protected doEdit(val = '') {
    if (this.canEdit()) {
      const focus = this.selectionStore.get('focus');
      if (!focus) {
        return;
      }
      const data = this.columnService.getSaveData(focus.y, focus.x);
      this.setEdit?.emit({
        ...data,
        val,
      });
    }
  }

  /**
   * Close editor event triggered
   * @param details - if it requires focus next
   */
  private async closeEdit(e?: CustomEvent<boolean | undefined>) {
    this.cancelEdit.emit();
    if (e?.detail) {
      await this.focusNext();
    }
  }

  /**
   * Edit finished.
   * Close Editor and save.
   */
  protected cellEdit(e: SaveDataDetails) {
    const dataToSave = this.columnService.getSaveData(e.rgRow, e.rgCol, e.val);
    this.cellEditApply.emit(dataToSave);
  }

  private getRegion() {
    const focus = this.selectionStore.get('focus');
    let range = this.selectionStore.get('range');
    if (!range) {
      range = getRange(focus, focus);
    }
    return range;
  }
  private onCopy(e: DataTransfer) {
    const range = this.getRegion();
    const canCopyEvent = this.beforeCopyRegion.emit(range);
    if (canCopyEvent.defaultPrevented) {
      return false;
    }
    let rangeData: DataFormat[][] | undefined;

    if (range) {
      const { data, mapping } = this.columnService.copyRangeArray(
        range,
        this.dataStore,
      );
      const event = this.rangeClipboardCopy.emit({
        range,
        data,
        mapping,
        ...this.types,
      });
      if (!event.defaultPrevented) {
        rangeData = event.detail.data;
      }
    }

    this.clipboard?.doCopy(e, rangeData);
    return true;
  }

  private onPaste(data: string[][]) {
    const focus = this.selectionStore.get('focus');
    const isEditing = this.selectionStore.get('edit') !== null;
    if (!focus || isEditing) {
      return;
    }
    let { changed, range } = this.columnService.getTransformedDataToApply(
      focus,
      data,
    );
    const { defaultPrevented: canPaste } = this.rangeClipboardPaste.emit({
      data: changed,
      models: collectModelsOfRange(changed, this.dataStore),
      range,
      ...this.types,
    });

    if (canPaste) {
      return;
    }
    this.autoFillService?.onRangeApply(changed, range, range);
  }

  private async focusNext() {
    const canFocus = await this.keyboardService?.keyChangeSelection(
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
    const range = this.selectionStore.get('range');
    if (range && !isRangeSingleCell(range)) {
      const data = this.columnService.getRangeStaticData(range, '');
      this.autoFillService?.onRangeApply(data, range, range);
    } else if (this.canEdit()) {
      const focused = this.selectionStore.get('focus');
      if (!focused) {
        return;
      }
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

  private rowDragStart({ detail }: CustomEvent<{ cell: Cell; text: string }>) {
    detail.text = getCellData(
      this.columnService.rowDataModel(detail.cell.y, detail.cell.x).value
    );
  }

  /**
   * Verify if edit allowed.
   */
  protected canEdit() {
    if (this.readonly) {
      return false;
    }
    const focus = this.selectionStore.get('focus');
    return focus && !this.columnService?.isReadOnly(focus.y, focus.x);
  }

  get edited(): EditCellStore | null {
    return this.selectionStore.get('edit');
  }

  /**
   * Sets the focus on a cell and optionally edits a range.
   */
  focus(cell?: Cell, isRangeEdit = false) {
    if (!cell) return false;

    const end = cell;
    const start = this.selectionStore.get('focus');

    if (isRangeEdit && start) {
      const range = getRange(start, end);
      if (range) {
        return this.triggerRangeEvent(range);
      }
    }

    return this.doFocus(cell, end);
  }

  get types(): AllDimensionType {
    return {
      rowType: this.dataStore.get('type'),
      colType: this.columnService.type,
    };
  }

  /**
   * Collect data
   */
  protected getData(): EventData {
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
