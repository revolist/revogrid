import {Component, h, Listen, Prop, Watch} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import {DimensionSettingsState, Selection} from '../../../interfaces';
import {ColumnServiceI} from '../../data/columnService';
import {getItemByIndex} from '../../../store/dimension/dimension.helpers';
import CellSelectionService from './cellSelectionService';
import SelectionStore from '../../../store/selection/selection.store';
import {Components} from '../../../components';
import {codesLetter} from '../../../utils/keyCodes';
import {isLetterKey} from '../../../utils/keyCodes.utils';
import {
    CELL_CLASS,
    FOCUS_CLASS,
    SELECTION_BG_CLASS,
    SELECTION_BORDER_CLASS,
    TMP_SELECTION_BG_CLASS
} from '../../../utils/consts';
import RangeAreaCss = Selection.RangeAreaCss;
import RevogrEdit = Components.RevogrEdit;


@Component({
    tag: 'revogr-overlay-selection'
})
export class OverlaySelection {
    private selectionService: CellSelectionService;
    private selectionStore: SelectionStore;
    private editSection: RevogrEdit|undefined;
    private focusSection: HTMLInputElement;

    @Prop() readonly: boolean;
    @Prop() parent: string = '';

    @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
    @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;
    @Prop() columnService: ColumnServiceI;
    @Prop() lastCell: Selection.Cell;
    @Watch('lastCell') lastCellChanged(cell: Selection.Cell): void {
        this.selectionStore?.setLastCell(cell);
    }
    @Prop() position: Selection.Cell;

    @Listen('dblclick', { target: 'parent' })
    onDoubleClick(): void {
        this.canEdit() && this.editSection?.doEdit();
    }

    @Listen('keydown', { target: 'parent' })
    handleKeyDown(e: KeyboardEvent){
        this.selectionService.keyDown(e);


        if (this.selectionStore.edited) {
            switch (e.code) {
                case codesLetter.ESCAPE:
                    this.canEdit() && this.editSection?.doEdit(false);
                    break;
            }
            return;
        }
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isLetterKey(e.keyCode) || isEnter) {
            this.canEdit() && this.editSection?.doEdit(!isEnter ? e.key : '');
        }
    }

    private canEdit(): boolean {
        const editCell = this.selectionStore.focused;
        return editCell && !this.columnService?.isReadOnly(editCell.y, editCell.x);
    }

    connectedCallback(): void {
        this.selectionStore = new SelectionStore(this.lastCell, this.position);
        this.selectionService = new CellSelectionService(
            `${this.parent} .${CELL_CLASS}`,
            {
                focus: (cell, isMulti?) => this.selectionStore.focus(cell, isMulti),
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
        if (this.selectionStore?.focused) {
            this.focusSection?.focus({preventScroll: true});
        }
    }

    render() {
        const range = this.selectionStore.store.get('range');
        const selectionFocus = this.selectionStore.store.get('focus');
        const tempRange = this.selectionStore.store.get('tempRange');
        const els: HTMLElement[] = [];
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
        if (selectionFocus) {
            const style: RangeAreaCss = this.getElStyle({
                x: selectionFocus.x,
                y: selectionFocus.y,
                x1: selectionFocus.x,
                y1: selectionFocus.y
            });
            els.push(<div class={FOCUS_CLASS} style={style}/>);
        }
        els.push(<input type='text' class='edit-focus-input' ref={el => this.focusSection = el}/>);
        if (!this.readonly) {
            const editCell = this.selectionStore.store.get('edit');
            els.push(<revogr-edit
                ref={el => this.editSection = el}
                editCell={editCell && {...editCell, val: editCell.val || this.columnService.getCellData(editCell.y, editCell.x)}}
                dimensionRow={this.dimensionRow}
                dimensionCol={this.dimensionCol}
            />);
        }
        return els;
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