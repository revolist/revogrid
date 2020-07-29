import {Component, Event, EventEmitter, h} from '@stencil/core';

import selectionStore from '../../../store/selection.strore';
import {getItemByIndex} from '../../../store/dimension.helpers';
import {colsStore, rowsStore} from '../../../store/dimension.store';
import dataProvider from '../../../services/data.provider';
import moduleRegister from '../../../services/moduleRegister';
import CellEditService from './cellEditService';
import {CELL_CLASS} from '../../../utils/consts';
import {Edition, PositionItem, Selection} from '../../../interfaces';

@Component({
    tag: 'revogr-edit'
})
export class Edit {
    private editCell: typeof selectionStore.state.edit = null;
    private cellEditModule!: CellEditService;

    @Event() beforeEdit: EventEmitter<Edition.SaveDataDetails>;
    onSave(e: CustomEvent<Edition.SaveData>): void {
        e.stopPropagation();
        setTimeout(() => {
            this.editCell = selectionStore.get('edit');
            if (this.editCell) {
                this.beforeEdit.emit({
                    col: this.editCell.x,
                    row: this.editCell.y,
                    val: e.detail
                });
            }
            this.cellEditModule.close();
        }, 0);
    }

    connectedCallback(): void {
        this.cellEditModule = new CellEditService(`${moduleRegister.baseClass} .${CELL_CLASS}`);
        moduleRegister.register('cellEdit', this.cellEditModule);
    }

    disconnectedCallback(): void {
        moduleRegister.unregister('cellEdit');
    }

    render() {
        this.editCell = selectionStore.get('edit');
        if (!this.editCell) {
            return;
        }
        const x: number = this.editCell.x;
        const y: number = this.editCell.y;
        const col: PositionItem = getItemByIndex(colsStore.state, x);
        const row: PositionItem = getItemByIndex(rowsStore.state, y);
        const style: Selection.RangeAreaCss = {
            left: `${col.start}px`,
            top: `${row.start}px`,
            width: `${col.end - col.start}px`,
            height: `${row.end - row.start}px`
        };
        return <div style={style} class='edit-input-wrapper'>
            <revogr-text-editor
                value={this.editCell.val ? this.editCell.val : dataProvider.data(y, x)}
                onEdit={(e) => this.onSave(e)}/>
        </div>;
    }
}