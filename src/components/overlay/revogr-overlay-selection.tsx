import {Component, Event, EventEmitter, h, Host, Listen, Prop, VNode, Watch, Element, State} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import slice from 'lodash/slice';

import {Edition, RevoGrid, Selection} from '../../interfaces';
import ColumnService from '../data/columnService';
import CellSelectionService, { getCell, getElStyle } from './cellSelectionService';
import SelectionStoreService from '../../store/selection/selection.store.service';
import {codesLetter} from '../../utils/keyCodes';
import {isClear, isLetterKey} from '../../utils/keyCodes.utils';
import {
  CELL_HANDLER_CLASS,
  EDIT_INPUT_WR,
  SELECTION_BORDER_CLASS
} from '../../utils/consts';
import {DataSourceState, getSourceItem} from '../../store/dataSource/data.store';
import { getRange, isRangeSingleCell } from '../../store/selection/selection.helpers';
import { timeout } from '../../utils/utils';
import KeyService from './keyService';

import RangeAreaCss = Selection.RangeAreaCss;

export type BeforeEdit = {
  isCancel: boolean;
}&Edition.BeforeSaveDataDetails;

@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss'
})
export class OverlaySelection {
  private selectionService: CellSelectionService;
  private columnService: ColumnService;

  private selectionStoreService: SelectionStoreService;
  private keyService: KeyService;
  private orderEditor: HTMLRevogrOrderEditorElement;
  private clipboard: HTMLRevogrClipboardElement;

  @Element() element: HTMLElement;
  @State() autoFill: boolean = false;

  // --------------------------------------------------------------------------
  //
  //  Properties
  //
  // --------------------------------------------------------------------------

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;

  /** Dynamic stores */
  @Prop() selectionStore: ObservableMap<Selection.SelectionStoreState>;
  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  @Prop() colData: ObservableMap<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
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

  @Event({ bubbles: false }) setEdit: EventEmitter<BeforeEdit>;
  @Event({ bubbles: false }) setRange: EventEmitter<Selection.RangeArea>;
  @Event({ bubbles: false }) setTempRange: EventEmitter<Selection.RangeArea|null>;

  @Event({ bubbles: false }) focusCell: EventEmitter<Selection.FocusedCells>;
  @Event({ bubbles: false }) unregister: EventEmitter;

  /** Selection range changed */
  @Event({ cancelable: true }) internalSelectionChanged: EventEmitter<Selection.ChangedRange>;


  /** Range data apply */
  @Event({ cancelable: true }) internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;
  

  
  // --------------------------------------------------------------------------
  //
  //  Listeners
  //
  // --------------------------------------------------------------------------

   /** Pointer left document, clear any active operation */
   @Listen('mousemove', { target: 'document' })
   onMouseMove(e: MouseEvent): void {
    if (this.autoFill && this.selectionStoreService.focused) {
      this.selectionService.onMouseMove(e, this.getData())
    }
   }

  /** Pointer left document, clear any active operation */
  @Listen('mouseleave', { target: 'document' })
  onMouseOut(): void {
    this.selectionService.clearSelection();
  }

  /** Action finished inside of the document */
  @Listen('mouseup', { target: 'document' })
  onMouseUp(): void {
    this.selectionService.clearSelection();
  }

  /** Row drag started */
  @Listen('dragStartCell')
  onCellDrag(e: CustomEvent<MouseEvent>): void {
    this.orderEditor?.dragStart(e.detail);
  }


  /** Recived keyboard down from element */
  @Listen('keyup', { target: 'document' })
  onKeyUp(e: KeyboardEvent): void {
    this.keyService.keyUp(e);
  }

  /** Recived keyboard down from element */
  @Listen('keydown', { target: 'document' })
  async onKeyDown(e: KeyboardEvent): Promise<void> {
    if (!this.selectionStoreService.focused) {
      return;
    }
    this.keyService.keyDown(e);

    // tab key means same as arrow right
    if (codesLetter.TAB === e.code) {
      this.keyChangeSelection(e);
      return;
    }

    /**
     *  IF EDIT MODE
     */
    if (this.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.doEdit(undefined, true);
          break;
      }
      return;
    }
    
    /**
     *  IF NOT EDIT MODE
     */

    // pressed clear key
    if (isClear(e.code)) {
      if (this.selectionStoreService.ranged && !isRangeSingleCell(this.selectionStoreService.ranged)) {
        const data = this.columnService.getRangeStaticData(this.selectionStoreService.ranged, '');
        this.onRangeApply(data, this.selectionStoreService.ranged);
      } else if (this.canEdit()) {
        const focused = this.selectionStoreService.focused;
        this.onCellEdit({ row: focused.y, col: focused.x, val: '' }, true);
      }
      return;
    }
    
    // pressed enter
    if (codesLetter.ENTER === e.code) {
      this.doEdit();
      return;
    }

    // copy operation
    if (this.keyService.isCopy(e)) {
      return;
    }

    // paste operation
    if (this.keyService.isPaste(e)) {
      this.internalPaste.emit();
      return;
    }

    // pressed letter key
    if (isLetterKey(e.keyCode)) {
      this.doEdit(e.key);
      return;
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e)) {
      return;
    }
  }

  @Watch('range') onRange(canRange: boolean): void {
    this.selectionService.canRange = canRange;
  }

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.selectionStoreService = new SelectionStoreService(this.selectionStore, {
      changeRange: (range) => {
        this.setRange.emit(range);
      },
      focus: (focus, end) => {
        const focused = { focus, end };
        const {defaultPrevented} = this.internalFocusCell.emit(this.columnService.getSaveData(focus.y, focus.x));
        if (defaultPrevented) {
          return;
        }
        this.focusCell.emit(focused);
      },
      unregister: () => this.unregister?.emit()
    });
    this.selectionService = new CellSelectionService({
      canRange: this.range,
      changeRange: (range) => {
        this.selectionStoreService.changeRange(range);
      },
      focus: (cell, isMulti?) => {
        this.selectionStoreService.focus(cell, isMulti);
      },
      applyRange: (start?, end?) => {
        // no changes to apply
        if (!start || !end) {
          return;
        }
        
        const oldRange = this.selectionStoreService.ranged;
        const newRange = getRange(start, end);
        const columns = [...this.columnService.columns];
        const rangeData: Selection.ChangedRange = {
          type: this.dataStore.get('type'),
          newData: {},
          newRange,
          oldRange,
          newProps: slice(columns, newRange.x, newRange.x1 + 1).map(v => v.prop),
          oldProps: slice(columns, oldRange.x, oldRange.x1 + 1).map(v => v.prop),
        };

        rangeData.newData = this.columnService.getRangeData(rangeData);
        const selectionEndEvent = this.internalSelectionChanged.emit(rangeData);
        if (selectionEndEvent.defaultPrevented) {
          this.setTempRange.emit(null);
          return;
        }
        this.onRangeApply(rangeData.newData, newRange);
      },
      tempRange: (start, end) => {
        this.setTempRange.emit(getRange(start, end));
      },
      autoFill: (isAutofill) => {
        let focus = this.selectionStoreService.focused;
        const range = this.selectionStoreService.ranged;
        if (range) {
          focus = {x: range.x, y: range.y};
        }
        if (!focus && !range) {
          return null;
        }
        this.autoFill = isAutofill;
        return focus;
      }
    });
    this.keyService = new KeyService();
  }

  disconnectedCallback() {
    this.selectionStoreService.destroy();
  }

  private renderRange(range: Selection.RangeArea): VNode[] {
    const style: RangeAreaCss = getElStyle(range, this.dimensionRow.state, this.dimensionCol.state);
    return [<div class={SELECTION_BORDER_CLASS} style={style}/>];
  }

  private renderAutofill(range: Selection.RangeArea, selectionFocus: Selection.Cell): VNode {
    let handlerStyle;
    if (range) {
      handlerStyle = getCell(range, this.dimensionRow.state, this.dimensionCol.state);
    } else {
      handlerStyle = getCell({
        ...selectionFocus,
        x1: selectionFocus.x,
        y1: selectionFocus.y
      }, this.dimensionRow.state, this.dimensionCol.state);
    }
    const props = {
      class: CELL_HANDLER_CLASS,
      onMouseDown: (e: MouseEvent) => this.selectionService.onAutoFillStart(e, this.getData()),
      style: { left: `${handlerStyle.right}px`, top: `${handlerStyle.bottom}px`, }
    };
    return <div {...props}/>;
  }

  private renderEditCell(): VNode|void {
    // if can edit
    const editCell = this.selectionStore.get('edit');
    if (this.readonly || !editCell) {
      return;
    }
    const val = editCell.val || this.columnService.getCellData(editCell.y, editCell.x);
    const editable = {
      ...editCell,
      ...this.columnService.getSaveData(editCell.y, editCell.x, val)
    };

    const style = getElStyle({...editCell, x1: editCell.x, y1: editCell.y }, this.dimensionRow.state, this.dimensionCol.state);
    return <revogr-edit
      class={EDIT_INPUT_WR}
      onCellEdit={e => this.onCellEdit(e.detail)}
      onCloseEdit={focusNext => {
        this.doEdit(undefined, true);
        if (focusNext) {
          this.focusNext();
        }
      }}
      editCell={editable}
      column={this.columnService.columns[editCell.x]}
      editor={this.columnService.getCellEditor(editCell.y, editCell.x, this.editors)}
      style={style}
    />
  }

  render() {
    const range = this.selectionStoreService.ranged;
    const selectionFocus = this.selectionStoreService.focused;
    const els: VNode[] = [];

    if (range || selectionFocus) {
      els.push(<revogr-clipboard
        onCopyRegion={(e) => this.onCopy(e.detail)} ref={e => this.clipboard = e}
        onPasteRegion={(e) => this.onPaste(e.detail)}
        />
      );
    }

    if (range) {
      els.push(...this.renderRange(range));
    }

    const editCell = this.renderEditCell();
    if (editCell) {
      els.push(editCell);
    }

    if (selectionFocus && !this.readonly && !editCell && this.range) {
      els.push(this.renderAutofill(range, selectionFocus));
    }

    const hostProps: {
      onDblClick(): void;
      onMouseDown(e: MouseEvent): void;
    } = {
      onDblClick: () => this.doEdit(),
      onMouseDown: (e: MouseEvent) => this.onMouseDown(e),
    };

    if (this.canDrag) {
      els.push(<revogr-order-editor
        ref={(e) => this.orderEditor = e}
        dataStore={this.dataStore}
        dimensionRow={this.dimensionRow}
        dimensionCol={this.dimensionCol}
        parent={this.element}
        onInternalRowDragStart={(e) => this.onRowDragStart(e)}/>);
    }
    return <Host {...hostProps}>{els}<slot name='data'/></Host>;
  }

  private doEdit(val = '', isCancel = false) {
    if (this.canEdit()) {
      const editCell = this.selectionStore.get('focus');
      const data = this.columnService.getSaveData(editCell.y, editCell.x);
      this.setEdit?.emit({
        ...data,
        isCancel,
        val
      });
    }
  }

  private focusNext() {
    this.keyChangeSelection(new KeyboardEvent('keydown', {
      code: codesLetter.ARROW_DOWN
    }));
  }

  private async keyChangeSelection(e: KeyboardEvent): Promise<boolean> {
    const data = this.keyService.changeDirectionKey(e, this.range);
    if (!data) {
      return false;
    }
    await timeout();

    const range = this.selectionStore.get('range');
    const focus = this.selectionStore.get('focus');
    this.selectionService.keyPositionChange(data.changes, this.getData(), range, focus, data.isMulti);
    return true;
  }

  private onPaste(data: string[][]): void {
    const focus = this.selectionStoreService.focused;
    if (!focus) {
      return;
    }
    const {changed, range} = this.columnService.getTransformedDataToApply(focus, data);
    this.onRangeApply(changed, range);
  }

  private onCopy(e: DataTransfer): void {
    const canCopy = this.internalCopy.emit();
    if (canCopy.defaultPrevented) {
      return;
    }
    let focus = this.selectionStoreService.focused;
    let range = this.selectionStoreService.ranged;
    let data: RevoGrid.DataFormat[][];
    if (!range) {
      range = getRange(focus, focus);
    }
    if (range) {
      const columns = [...this.columnService.columns];
      const props = slice(columns, range.x, range.x1 + 1).map(v => v.prop);
      data = this.columnService.copyRangeArray(
        range,
        props,
        this.dataStore
      );
    }
    this.clipboard.doCopy(e, data);
  }

  private onRangeApply(data: RevoGrid.DataLookup, range: Selection.RangeArea): void {
    const models: RevoGrid.DataLookup = {};
    for (let rowIndex in data) {
      models[rowIndex] = getSourceItem(this.dataStore, parseInt(rowIndex, 10))
    }
    const dataEvent = this.internalRangeDataApply.emit({
      data,
      models,
      type: this.dataStore.get('type')
    });
    if (!dataEvent.defaultPrevented) {
      this.columnService.applyRangeData(data);
    }
    this.setRange.emit(range);
  }

  private onCellEdit(e: Edition.SaveDataDetails, clear = false): void {
    const dataToSave = this.columnService.getSaveData(e.row, e.col, e.val);
    this.internalCellEdit.emit(dataToSave);
    // if not clear navigate to next cell after edit
    if (!clear && !e.preventFocus) {
      this.focusNext();
    }
  }

  private onMouseDown(e: MouseEvent): void {
    /** ignore focus if clicked input */
    if ((e.target as HTMLElement|undefined)?.closest(`.${EDIT_INPUT_WR}`)) {
      return;
    }
    this.selectionService.onCellDown(e, this.getData());
  }

  private onRowDragStart({detail}: CustomEvent<{cell: Selection.Cell, text: string}>): void {
    detail.text = this.columnService.getCellData(detail.cell.y, detail.cell.x);
  }

  private canEdit(): boolean {
    if (this.readonly) {
      return false;
    }
    const editCell = this.selectionStoreService.focused;
    return editCell && !this.columnService?.isReadOnly(editCell.y, editCell.x);
  }

  private getData() {
    return {
      el: this.element,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
      lastCell: this.lastCell
    }
  }
}
