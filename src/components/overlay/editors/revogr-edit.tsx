import {Component, Event, EventEmitter, Prop, h} from '@stencil/core';

import CellEditService from './cellEditService';
import {DimensionSettingsState, Edition, Selection} from '../../../interfaces';
import {ObservableMap} from '@stencil/store';
import { getItemByIndex } from '../../../store/dimension/dimension.helpers';
import dataProvider from '../../../services/data.provider';
import {CELL_CLASS} from '../../../utils/consts';

@Component({
    tag: 'revogr-edit'
})
export class Edit {
    @Prop() parent: string = '';
    @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
    @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;
    @Prop() editCell: Edition.EditCell|null = null;
    private cellEditModule!: CellEditService;

    @Event() beforeEdit: EventEmitter<Edition.SaveDataDetails>;
    onSave(e: CustomEvent<Edition.SaveData>): void {
        e.stopPropagation();
        setTimeout(() => {
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
        this.cellEditModule = new CellEditService(`${this.parent} .${CELL_CLASS}`);
    }

    disconnectedCallback(): void {
        this.cellEditModule.destroy();
    }

    render() {
        if (!this.editCell) {
            return '';
        }
        const x: number = this.editCell.x;
        const y: number = this.editCell.y;
        const col = getItemByIndex(this.dimensionCol.state, x);
        const row = getItemByIndex(this.dimensionRow.state, y);
        const style: Selection.RangeAreaCss = {
            left: `${col.start}px`,
            top: `${row.start}px`,
            width: `${col.end - col.start}px`,
            height: `${row.end - row.start}px`
        };
        return <div style={style} class='edit-input-wrapper'>
            <revogr-text-editor
                value={this.editCell.val ? this.editCell.val : dataProvider.getCellData(y, x)}
                onEdit={(e) => this.onSave(e)}/>
        </div>;
    }
}