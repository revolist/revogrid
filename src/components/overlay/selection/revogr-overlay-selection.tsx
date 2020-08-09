import {Component, h, Prop} from '@stencil/core';
import selectionStore from '../../../store/selection/selection.strore';
import dimensionStore from '../../../store/dimension/dimension.store';
import {getItemByIndex} from '../../../store/dimension/dimension.helpers';
import {
    SELECTION_BORDER_CLASS,
    SELECTION_BG_CLASS,
    TMP_SELECTION_BG_CLASS,
    CELL_CLASS,
    FOCUS_CLASS
} from '../../../utils/consts';
import moduleRegister from '../../../services/moduleRegister';
import CellSelectionService from './cellSelectionService';
import {Selection} from '../../../interfaces';

import RangeAreaCss = Selection.RangeAreaCss;
import RangeArea = Selection.RangeArea;

@Component({
    tag: 'revogr-overlay-selection'
})
export class OverlaySelection {
    @Prop() range: boolean;
    connectedCallback(): void {
        moduleRegister.register('cellSelection',
            new CellSelectionService(`${moduleRegister.baseClass} .${CELL_CLASS}`, this.range));
    }

    disconnectedCallback(): void {
        moduleRegister.unregister('cellSelection');
    }

    render() {
        const range: typeof selectionStore.state.range = selectionStore.get('range');
        const focus: typeof selectionStore.state.focus = selectionStore.get('focus');
        const tempRange: typeof selectionStore.state.tempRange = selectionStore.get('tempRange');
        const els: HTMLElement[] = [];
        if (range) {
            const style: RangeAreaCss = OverlaySelection.getElStyle(range);
            els.push(
                <div class={SELECTION_BORDER_CLASS} style={style}/>,
                <div class={SELECTION_BG_CLASS} style={style}/>
            );
        }
        if (tempRange) {
            const style: RangeAreaCss = OverlaySelection.getElStyle(tempRange);
            els.push(<div class={TMP_SELECTION_BG_CLASS} style={style}/>);
        }
        if (focus) {
            const style: RangeAreaCss = OverlaySelection.getElStyle({
                x: focus.x,
                y: focus.y,
                x1: focus.x,
                y1: focus.y
            });
            els.push(<div class={FOCUS_CLASS} style={style}/>);
        }
        return els;
    }

    private static getElStyle(range: RangeArea): RangeAreaCss {
        const y: number = getItemByIndex(dimensionStore.row.state, range.y).start;
        const x: number = getItemByIndex(dimensionStore.col.state, range.x).start;
        const y1: number = getItemByIndex(dimensionStore.row.state, range.y1).end;
        const x1: number = getItemByIndex(dimensionStore.col.state, range.x1).end;
        return  {
            left: `${x}px`,
            top: `${y}px`,
            width: `${x1-x}px`,
            height: `${y1-y}px`
        };
    }
}