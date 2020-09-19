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
  FOCUS_CLASS,
  SELECTION_BG_CLASS,
  SELECTION_BORDER_CLASS,
  TMP_SELECTION_BG_CLASS
} from '../../utils/consts';
import {DataSourceState} from '../../store/dataSource/data.store';

import RangeAreaCss = Selection.RangeAreaCss;
import Cell = Selection.Cell;


@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss'
})
export class OverlaySelection {
  private selectionService: CellSelectionService;
  private columnService: ColumnService;

  private selectionStoreService: SelectionStore;
  private focusSection: HTMLInputElement;
  private orderEditor: HTMLRevogrOrderEditorElement;

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

  @Event({ cancelable: true }) cellEditInitiate: EventEmitter<Edition.BeforeSaveDataDetails>;

  @Event({ bubbles: false }) setEdit: EventEmitter<string|boolean>;
  @Event({ bubbles: false }) changeSelection: EventEmitter<{changes: Partial<Selection.Cell>; isMulti?: boolean; }>;
  @Event({ bubbles: false }) focusCell: EventEmitter<{focus: Selection.Cell; end: Selection.Cell; }>;
  @Event({ bubbles: false }) unregister: EventEmitter;

  /** Selection range changed */
  @Event({ cancelable: true }) initialSelectionChanged: EventEmitter<Selection.ChangedRange>;

  /** Pointer left document, clear any active operation */
  @Listen('mouseleave', { target: 'document' })
  onMouseOut(): void {
    this.selectionService.clearSelection();
    this.orderEditor?.clearOrder();
  }

  /** Action finished inside of the document */
  @Listen('mouseup', { target: 'document' })
  onMouseUp(e: MouseEvent): void {
    this.selectionService.clearSelection();
    this.orderEditor?.endOrder(e, this.getData());
  }

  /** Row drag started */
  @Listen('dragStartCell')
  onCellDrag(e: CustomEvent<MouseEvent>): void {
    this.orderEditor?.dragStart(e.detail, this.getData());
  }

  /** Recived keyboard down from element */
  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent): void {
    this.selectionService.keyDown(e);
    if (this.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.canEdit() && this.setEdit?.emit(false);
          break;
      }
      return;
    }
    const isEnter: boolean = codesLetter.ENTER === e.code;
    if (isLetterKey(e.keyCode) || isEnter) {
      this.canEdit() &&  this.setEdit?.emit(!isEnter ? e.key : '');
    }
  }

  @Watch('range') onRange(canRange: boolean): void {
    this.selectionService.canRange = canRange;
  }

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.selectionStoreService = new SelectionStore(this.selectionStore, {
      lastCell: this.lastCell,
      change: (changes, isMulti?) => this.changeSelection?.emit({ changes, isMulti }),
      focus: (focus, end) => this.focusCell?.emit({ focus, end }),
      unregister: () => this.unregister?.emit()

    });
    this.selectionService = new CellSelectionService({
      canRange: this.range,
      focus: (cell, isMulti?) => this.selectionStoreService.focus(cell, isMulti),
      applyRange: (start, end) => {
        const old = this.selectionStore.get('range');
        const selectionEndEvent = this.initialSelectionChanged.emit({
          newRange: {start, end},
          oldRange: {
            start: {x: old.x, y: old.y},
            end: {x: old.x1, y: old.y1}
          }
        });
        if (selectionEndEvent.defaultPrevented) {
          this.selectionStoreService.clearTemp();
          return;
        }
        this.selectionStoreService.applyRange(start, end);
      },
      tempRange: (start, end) => this.selectionStoreService.setTempRange(start, end),
      change: (changes, isMulti?) => this.changeSelection?.emit({ changes, isMulti }),
      autoFill: (isAutofill) => {
        const focus = this.selectionStore.get('focus');
        if (!focus) {
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

  componentDidRender(): void {
    if (this.selectionStoreService?.focused && document.activeElement !== this.focusSection) {
      this.focusSection?.focus({ preventScroll: true });
    }
  }

  private renderRange(range: Selection.RangeArea): VNode[] {
    const style: RangeAreaCss = this.getElStyle(range);
    return [<div class={SELECTION_BORDER_CLASS} style={style}/>,
      <div class={SELECTION_BG_CLASS} style={style}/>];
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
      class='edit-input-wrapper'
      onCellEdit={(e: CustomEvent<Edition.SaveDataDetails>) => this.onCellEdit(e.detail)}
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

    els.push(<input
      type='text'
      class='edit-focus-input'
      ref={el => this.focusSection = el}
      style={{...focusStyle, width: '0', height: '0'}}/>);


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
      onMouseDown: (e: MouseEvent) => this.selectionService.onCellDown(e, this.getData()),
    };
    if (this.autoFill && selectionFocus) {
      hostProps.onMouseMove = (e: MouseEvent) => this.selectionService.onMouseMove(e, this.getData())
    }

    if (this.canDrag) {
      els.push(<revogr-order-editor ref={(e) => this.orderEditor = e}
        dataStore={this.dataStore}
        onRowDragStart={(e) => this.onRowDragStart(e)}
        onRowDragEnd={() => this.onRowDragEnd()}/>);
    }
    return <Host {...hostProps}>{els}<slot name='data'/></Host>;
  }

  private onCellEdit(e: Edition.SaveDataDetails): void {
    const dataToSave = this.columnService.getSaveData(e.row, e.col, e.val);
    this.cellEditInitiate.emit(dataToSave);
  }
  
  private onDoubleClick(): void {
    this.canEdit() && this.setEdit?.emit('');
  }

  private onRowDragEnd(): void {
    this.element.classList.remove('drag-active');
  }
  
  private onRowDragStart({detail}: CustomEvent<{cell: Selection.Cell, text: string}>): void {
    detail.text = this.columnService.getCellData(detail.cell.y, detail.cell.x);
    this.element.classList.add('drag-active');
  }

  private canEdit(): boolean {
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
