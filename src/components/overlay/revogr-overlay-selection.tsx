import {Component, Event, EventEmitter, h, Host, Listen, Prop, VNode, Watch, Element, State} from '@stencil/core';
import {ObservableMap} from '@stencil/store';

import {Edition, RevoGrid, Selection} from '../../interfaces';
import ColumnService from '../data/columnService';
import {getItemByIndex} from '../../store/dimension/dimension.helpers';
import CellSelectionService from './cellSelectionService';
import SelectionStore from '../../store/selection/selection.store';
import {codesLetter} from '../../utils/keyCodes';
import {isLetterKey} from '../../utils/keyCodes.utils';
import {
  CELL_HANDLER_CLASS,
  EDIT_INPUT_WR,
  FOCUS_CLASS,
  SELECTION_BORDER_CLASS,
  TMP_SELECTION_BG_CLASS
} from '../../utils/consts';
import {DataSourceState} from '../../store/dataSource/data.store';

import RangeAreaCss = Selection.RangeAreaCss;
import Cell = Selection.Cell;
import { slice } from 'lodash';
import { getRange, isRangeSingleCell } from '../../store/selection/selection.helpers';
import { timeout } from '../../utils/utils';


@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss'
})
export class OverlaySelection {
  private selectionService: CellSelectionService;
  private columnService: ColumnService;

  private selectionStoreService: SelectionStore;
  private orderEditor: HTMLRevogrOrderEditorElement;
  private copyData: string;

  @Element() element: HTMLElement;

  @State() autoFill: boolean = false;

  @Prop() readonly: boolean;
  @Prop() range: boolean;
  @Prop() canDrag: boolean;

  /** Dynamic stores */
  @Prop() selectionStore: ObservableMap<Selection.SelectionStoreState>;
  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

  /** Static stores, not expected to change during component lifetime */
  @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  @Prop() colData: RevoGrid.ColumnRegular[];
  /** Last cell position */
  @Prop() lastCell: Selection.Cell;
  /** Custom editors register */
  @Prop() editors: Edition.Editors;

  @Watch('colData') colChanged(newData: RevoGrid.ColumnRegular[]): void {
    this.columnService.columns = newData;
  }
  @Watch('lastCell') lastCellChanged(cell: Cell): void {
    this.selectionStoreService?.setLastCell(cell);
  }

  @Event({ cancelable: true }) internalCellEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Event({ cancelable: true }) internalFocusCell: EventEmitter<Edition.BeforeSaveDataDetails>;

  @Event({ bubbles: false }) setEdit: EventEmitter<string|boolean>;
  @Event({ bubbles: false }) changeSelection: EventEmitter<{changes: Partial<Selection.Cell>; isMulti?: boolean; }>;
  @Event({ bubbles: false }) focusCell: EventEmitter<Selection.FocusedCells>;
  @Event({ bubbles: false }) unregister: EventEmitter;

  /** Selection range changed */
  @Event({ cancelable: true }) internalSelectionChanged: EventEmitter<Selection.ChangedRange>;


  /** Range data apply */
  @Event({ cancelable: true }) internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;
  

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
  @Listen('keydown', { target: 'document' })
  async handleKeyDown(e: KeyboardEvent): Promise<void> {
    if (!this.selectionStoreService.focused) {
      return;
    }

    if (e.code=="KeyC"  && (e.metaKey || e.ctrlKey)){
      const focused = this.selectionStoreService.focused;
      const model = this.columnService.getCellData(focused.y, focused.x);
      this.copyData=model;
      return;
    }
    
    if (e.code=="KeyV"  && (e.metaKey || e.ctrlKey)){
      if (this.copyData){
        const focused = this.selectionStoreService.focused;
        if (this.columnService.isReadOnly(focused.y,focused.x)) return;
        this.columnService.setCellData(focused.y, focused.x,this.copyData);
        const model = this.columnService.getCellData(focused.y, focused.x);
        this.onCellEdit({ row: focused.y, col: focused.x, val: model }, true);  
      }
      return;
    }

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
          this.canEdit() && this.setEdit?.emit(false);
          break;
      }
      return;
    }
    
    /**
     *  IF NOT EDIT MODE
     */

    // pressed clear key
    if (codesLetter.BACKSPACE === e.code || codesLetter.DELETE === e.code) {
      if (this.selectionStoreService.range && !isRangeSingleCell(this.selectionStoreService.range)) {
        const data = this.columnService.getRangeStaticData(this.selectionStoreService.range, '');
        this.onRangeApply(data, this.selectionStoreService.range);
      } else if (this.canEdit()) {
        const focused = this.selectionStoreService.focused;
        this.onCellEdit({ row: focused.y, col: focused.x, val: '' }, true);
      }
      return;
    }
    
    // pressed enter
    if (codesLetter.ENTER === e.code) {
      if (this.canEdit()) {
        this.setEdit?.emit('');
      }
      return;
    }

    // pressed letter key
    if (isLetterKey(e.keyCode)) {
      if (this.canEdit()) {
        this.setEdit?.emit(e.key);
      }
      return;
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e)) {
      return;
    }
  }

  private async keyChangeSelection(e: KeyboardEvent): Promise<boolean> {
    const changes = this.selectionService.chaneKeyDown(e);
    if (changes) {
      await timeout();
      this.changeSelection?.emit(changes);
      return true;
    }
    return false;
  }

  @Watch('range') onRange(canRange: boolean): void {
    this.selectionService.canRange = canRange;
  }

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.selectionStoreService = new SelectionStore(this.selectionStore, {
      lastCell: this.lastCell,
      change: (changes, isMulti?) => this.changeSelection?.emit({ changes, isMulti }),
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
      focus: (cell, isMulti?) => this.selectionStoreService.focus(cell, isMulti),
      applyRange: (start?, end?) => {
        // no changes to apply
        if (!start || !end) {
          return;
        }
        
        const oldRange = this.selectionStore.get('range');
        const newRange = getRange(start, end);
        const rangeData: Selection.ChangedRange = {
          type: this.dataStore.get('type'),
          newData: {},
          newRange,
          oldRange,
          newProps: slice(this.colData, newRange.x, newRange.x1 + 1).map(v => v.prop),
          oldProps: slice(this.colData, oldRange.x, oldRange.x1 + 1).map(v => v.prop),
        };

        rangeData.newData = this.columnService.getRangeData(rangeData);
        const selectionEndEvent = this.internalSelectionChanged.emit(rangeData);
        if (selectionEndEvent.defaultPrevented) {
          this.selectionStoreService.clearTemp();
          return;
        }
        this.onRangeApply(rangeData.newData, newRange);
      },
      tempRange: (start, end) => this.selectionStoreService.setTempRange(start, end),
      autoFill: (isAutofill) => {
        let focus = this.selectionStore.get('focus');
        const range = this.selectionStore.get('range');
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
  }

  disconnectedCallback(): void {
    this.selectionStoreService.destroy();
  }

  private renderRange(range: Selection.RangeArea): VNode[] {
    const style: RangeAreaCss = this.getElStyle(range);
    return [<div class={SELECTION_BORDER_CLASS} style={style}/>];
  }

  private renderAutofill(range: Selection.RangeArea, selectionFocus: Selection.Cell): VNode {
    let handlerStyle;
    if (range) {
      handlerStyle = this.getCell(range);
    } else {
      handlerStyle = this.getCell({
        ...selectionFocus,
        x1: selectionFocus.x,
        y1: selectionFocus.y
      });
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

    const style = this.getElStyle({...editCell, x1: editCell.x, y1: editCell.y });

    return <revogr-edit
      class={EDIT_INPUT_WR}
      onCellEdit={e => this.onCellEdit(e.detail)}
      onCloseEdit={() => this.setEdit?.emit(false)}
      editCell={editable}
      column={this.columnService.columns[editCell.x]}
      editor={this.editors[this.columnService.getCellEditor(editCell.y, editCell.x)]}
      style={style}
    />
  }

  render() {
    const range = this.selectionStore.get('range');
    const selectionFocus = this.selectionStore.get('focus');
    const tempRange = this.selectionStore.get('tempRange');
    const els: VNode[] = [];

    if (range) {
      els.push(...this.renderRange(range));
    }

    if (tempRange) {
      const style: RangeAreaCss = this.getElStyle(tempRange);
      els.push(<div class={TMP_SELECTION_BG_CLASS} style={style}/>);
    }


    let focusStyle: Partial<RangeAreaCss> = {};
    if (selectionFocus) {
      focusStyle = this.getElStyle({
        ...selectionFocus,
        x1: selectionFocus.x,
        y1: selectionFocus.y
      });
      els.push(<div class={FOCUS_CLASS} style={focusStyle}/>);
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
      onMouseMove?(e: MouseEvent): void;
    } = {
      onDblClick: () => this.onDoubleClick(),
      onMouseDown: (e: MouseEvent) => this.onMouseDown(e),
    };
    if (this.autoFill && selectionFocus) {
      hostProps.onMouseMove = (e: MouseEvent) => this.selectionService.onMouseMove(e, this.getData())
    }

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

  private onRangeApply(data: {[rowIndex: number]: RevoGrid.DataType}, range: Selection.RangeArea): void {
    const dataEvent = this.internalRangeDataApply.emit({ data, type: this.dataStore.get('type') });
    if (!dataEvent.defaultPrevented) {
      this.columnService.applyRangeData(data);
    }
    this.selectionStoreService.applyRange(range);
  }

  private onCellEdit(e: Edition.SaveDataDetails, clear = false): void {
    const dataToSave = this.columnService.getSaveData(e.row, e.col, e.val);
    this.internalCellEdit.emit(dataToSave);
    // if not clear navigate to next cell after edit
    if (!clear) {
      this.keyChangeSelection(new KeyboardEvent('keydown', {
        code: codesLetter.ARROW_DOWN
      }));
    }
  }

  private onMouseDown(e: MouseEvent): void {
    /** ignore focus if clicked input */
    if ((e.target as HTMLElement|undefined)?.closest(`.${EDIT_INPUT_WR}`)) {
      return;
    }
    this.selectionService.onCellDown(e, this.getData());
  }
  
  private onDoubleClick(): void {
    this.canEdit() && this.setEdit?.emit('');
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
      cols: this.dimensionCol.state
    }
  }

  private getCell({x, y, x1, y1}: Selection.RangeArea) {
    const top: number = getItemByIndex(this.dimensionRow.state, y).start;
    const left: number = getItemByIndex(this.dimensionCol.state, x).start;
    const bottom: number = getItemByIndex(this.dimensionRow.state, y1).end;
    const right: number = getItemByIndex(this.dimensionCol.state, x1).end;

    return  {
      left,
      right,
      top,
      bottom,
      width: right-left,
      height: bottom-top
    };
  }

  private getElStyle(range: Selection.RangeArea): RangeAreaCss {
    const styles = this.getCell(range);
    return  {
      left: `${styles.left}px`,
      top: `${styles.top}px`,
      width: `${styles.width}px`,
      height: `${styles.height}px`
    };
  }
}
