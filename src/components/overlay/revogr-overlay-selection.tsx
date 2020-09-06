import {Component, Event, EventEmitter, h, Listen, Prop, VNode, Watch} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import {Edition, RevoGrid, Selection} from '../../interfaces';
import ColumnService from '../data/columnService';
import {getItemByIndex} from '../../store/dimension/dimension.helpers';
import CellSelectionService from './cellSelectionService';
import SelectionStore from '../../store/selection/selection.store';
import {codesLetter} from '../../utils/keyCodes';
import {isLetterKey} from '../../utils/keyCodes.utils';
import {
    CELL_CLASS,
    FOCUS_CLASS,
    SELECTION_BG_CLASS,
    SELECTION_BORDER_CLASS,
    TMP_SELECTION_BG_CLASS,
    UUID
} from '../../utils/consts';
import {DataSourceState} from '../../store/dataSource/data.store';
import RangeAreaCss = Selection.RangeAreaCss;


@Component({
    tag: 'revogr-overlay-selection'
})
export class OverlaySelection {
    private selectionService: CellSelectionService;
    private columnService: ColumnService;

    private selectionStore: SelectionStore;
    private focusSection: HTMLInputElement;

    @Prop() selectionStoreConnector: Selection.SelectionStoreConnectorI;

    @Prop() dataStore: ObservableMap<DataSourceState<RevoGrid.DataType>>;
    @Prop() colData: RevoGrid.ColumnDataSchemaRegular[];
    @Prop() readonly: boolean;
    @Prop() uuid: string;

    @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
    @Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

    @Prop() lastCell: Selection.Cell;
    @Prop() position: Selection.Cell;

    /**
     * Custom editors register
     */
    @Prop() editors: Edition.Editors = {};

    @Watch('colData') colChanged(newData: RevoGrid.ColumnDataSchemaRegular[]): void {
        this.columnService.columns = newData;
    }
    @Watch('lastCell') lastCellChanged(cell: Selection.Cell): void {
        this.selectionStore?.setLastCell(cell);
    }

    @Event() afterEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
    @Event() beforeEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
    @Listen('cellEdit')
    onSave(e: CustomEvent<Edition.SaveDataDetails>): void {
        e.cancelBubble = true;
        const dataToSave = this.columnService.getSaveData(e.detail.row, e.detail.col, e.detail.val);
        const beforeEdit: CustomEvent<Edition.BeforeSaveDataDetails> = this.beforeEdit.emit(dataToSave);
        // apply data
        setTimeout(() => {
            if (!beforeEdit.defaultPrevented) {
                this.columnService.setCellData(e.detail.row, e.detail.col, e.detail.val);
                this.afterEdit.emit(dataToSave);
            }
        });
    }

    @Listen('dblclick', { target: 'parent' })
    onDoubleClick(): void {
        this.canEdit() && this.selectionStoreConnector.setEdit('');
    }

    @Listen('keydown', { target: 'parent' })
    handleKeyDown(e: KeyboardEvent){
        this.selectionService.keyDown(e);
        if (this.selectionStore.edited) {
            switch (e.code) {
                case codesLetter.ESCAPE:
                    this.canEdit() && this.selectionStoreConnector.setEdit(false);
                    break;
            }
            return;
        }
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isLetterKey(e.keyCode) || isEnter) {
            this.canEdit() &&  this.selectionStoreConnector.setEdit(!isEnter ? e.key : '');
        }
    }

    private canEdit(): boolean {
        const editCell = this.selectionStore.focused;
        return editCell && !this.columnService?.isReadOnly(editCell.y, editCell.x);
    }

    connectedCallback(): void {
        this.columnService = new ColumnService(this.dataStore, this.colData);
        this.selectionStore = new SelectionStore(this.lastCell, this.position, this.selectionStoreConnector);
        this.selectionService = new CellSelectionService(
            `[${UUID}="${this.uuid}"] .${CELL_CLASS}`,
            {
                focus: (cell, isMulti?) => {
                    this.selectionStore.focus(cell, isMulti)
                },
                range: (start, end) => this.selectionStore.setRange(start, end),
                tempRange: (start, end) => this.selectionStore.setTempRange(start, end),
                change: (area, isMulti?) => this.selectionStore.change(area, isMulti)
            });
    }

    disconnectedCallback(): void {
        this.selectionService.destroy();
        this.selectionStore.destroy();
    }


    componentDidRender(): void {
        if (this.selectionStore?.focused && document.activeElement !== this.focusSection) {
            this.focusSection?.focus({ preventScroll: true });
        }
    }

    render() {
        const range = this.selectionStore.store.get('range');
        const selectionFocus = this.selectionStore.store.get('focus');
        const tempRange = this.selectionStore.store.get('tempRange');
        const els: (HTMLElement|VNode)[] = [];
        if (range) {
            const style: RangeAreaCss = this.getElStyle(range);
            els.push(
                <div class={SELECTION_BORDER_CLASS} style={style}/>,
                <div class={SELECTION_BG_CLASS} style={style}/>
            );
        }
        if (tempRange) {
            const style: RangeAreaCss = this.getElStyle(tempRange);
            els.push(<div class={TMP_SELECTION_BG_CLASS} style={style}/>);
        }
        let focusStyle: Partial<RangeAreaCss> = {};
        if (selectionFocus) {
            focusStyle = this.getElStyle({
                x: selectionFocus.x,
                y: selectionFocus.y,
                x1: selectionFocus.x,
                y1: selectionFocus.y
            });
            els.push(<div class={FOCUS_CLASS} style={focusStyle}/>);
        }
        els.push(<input type='text' class='edit-focus-input' ref={el => this.focusSection = el} style={focusStyle}/>);
        const editCell = this.getEditCell();
        if (editCell) {
            els.push(editCell);
        }

        return els;
    }

    private getEditCell(): VNode|void {
        // if can edit
        const editCell = this.selectionStore.store.get('edit');
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
            onCloseEdit={() => this.selectionStoreConnector.setEdit(false)}
            editCell={editable}
            column={this.columnService.columns[editCell.x]}
            editor={this.editors[this.columnService.getCellEditor(editCell.y, editCell.x)]}
            style={style}
        />
    }

    private getElStyle(range: Selection.RangeArea): RangeAreaCss {
        const y: number = getItemByIndex(this.dimensionRow.state, range.y).start;
        const x: number = getItemByIndex(this.dimensionCol.state, range.x).start;
        const y1: number = getItemByIndex(this.dimensionRow.state, range.y1).end;
        const x1: number = getItemByIndex(this.dimensionCol.state, range.x1).end;
        return  {
            left: `${x}px`,
            top: `${y}px`,
            width: `${x1-x}px`,
            height: `${y1-y}px`
        };
    }
}
