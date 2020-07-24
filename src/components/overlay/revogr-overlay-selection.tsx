import {Component, h, Prop} from '@stencil/core';
import selectionStore, {RangeI} from '../../store/selection.strore';
import {rowsStore, colsStore} from '../../store/dimension.store';
import {getItemByIndex} from '../../store/dimension.helpers';
import { SELECTION_BORDER_CLASS, SELECTION_BG_CLASS, TMP_SELECTION_BG_CLASS, CELL_CLASS } from '../data/cellConsts';
import moduleRegister from '../../services/moduleRegister';
import CellSelection from '../../services/cellSelection';

type SelectionArea = {
  left: string;
  top: string;
  width: string;
  height: string;
};

@Component({
    tag: 'revogr-overlay-selection'
})
export class OverlaySelection {
    @Prop() range: boolean;
    connectedCallback(): void {
        moduleRegister.register('cellSelection',
            new CellSelection(`${moduleRegister.baseClass} .${CELL_CLASS}`, this.range));
    }

    disconnectedCallback(): void {
        moduleRegister.unregister('cellSelection');
    }

    render() {
        const range: typeof selectionStore.state.range = selectionStore.get('range');
        const tempRange: typeof selectionStore.state.tempRange = selectionStore.get('tempRange');
        const els: HTMLElement[] = [];
        if (range) {
            const style: SelectionArea = OverlaySelection.getElStyle(range);
            els.push(
                <div class={SELECTION_BORDER_CLASS} style={style}/>,
                <div class={SELECTION_BG_CLASS} style={style}/>
            );
        }
        if (tempRange) {
            const style: SelectionArea = OverlaySelection.getElStyle(tempRange);
            els.push(<div class={TMP_SELECTION_BG_CLASS} style={style}/>);
        }
        return els;
    }

    private static getElStyle(range: RangeI): SelectionArea {
        const y: number = getItemByIndex(rowsStore.state, range.y).start;
        const x: number = getItemByIndex(colsStore.state, range.x).start;
        const y1: number = getItemByIndex(rowsStore.state, range.y1).end;
        const x1: number = getItemByIndex(colsStore.state, range.x1).end;
        return  {
            left: `${x}px`,
            top: `${y}px`,
            width: `${x1-x}px`,
            height: `${y1-y}px`
        };
    }
}