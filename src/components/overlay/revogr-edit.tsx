import {Component, Event, EventEmitter, h} from '@stencil/core';

import selectionStore from '../../store/selection.strore';
import {getItemByIndex} from '../../store/dimension.helpers';
import {colsStore, rowsStore} from '../../store/dimension.store';
import dataProvider from '../../services/data.provider';
import moduleRegister from '../../services/moduleRegister';
import CellEdit from '../../services/cellEdit';
import {CELL_CLASS} from '../../services/consts';
import {PositionItem, SaveData, SaveDataDetails, SelectionArea} from '../../interfaces';

@Component({
    tag: 'revogr-edit'
})
export class Edit {
    private editCell: typeof selectionStore.state.edit = null;
    private cellEditModule!: CellEdit;

    @Event() beforeEdit: EventEmitter<SaveDataDetails>;
    onSave(e: CustomEvent<SaveData>): void {
        e.stopPropagation();
        setTimeout(() => {
            this.editCell = selectionStore.get('edit');
            if (this.editCell) {
                this.beforeEdit.emit({
                    col: this.editCell[0],
                    row: this.editCell[1],
                    val: e.detail
                });
            }
            this.cellEditModule.close();
        }, 0);
    }

    connectedCallback(): void {
        this.cellEditModule = new CellEdit(`${moduleRegister.baseClass} .${CELL_CLASS}`);
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
        const x: number = this.editCell[0];
        const y: number = this.editCell[1];
        const col: PositionItem = getItemByIndex(colsStore.state, x);
        const row: PositionItem = getItemByIndex(rowsStore.state, y);
        const style: SelectionArea = {
            left: `${col.start}px`,
            top: `${row.start}px`,
            width: `${col.end - col.start}px`,
            height: `${row.end - row.start}px`
        };
        return <div style={style} class='edit-input-wrapper'>
            <revogr-text-editor
                value={this.editCell[2] ? this.editCell[2] : dataProvider.data(y, x)}
                onEdit={(e) => this.onSave(e)}/>
        </div>;
    }
}