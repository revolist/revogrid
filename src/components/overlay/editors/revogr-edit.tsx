import {Component, Event, EventEmitter, Prop, h, Method, Listen} from '@stencil/core';
import {ObservableMap} from '@stencil/store';

import CellEditService from './cellEditService';
import {DimensionSettingsState, Edition, Selection} from '../../../interfaces';
import { getItemByIndex } from '../../../store/dimension/dimension.helpers';

@Component({
    tag: 'revogr-edit'
})
export class Edit {
    @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
    @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;
    @Prop() editCell: Edition.EditCell|null = null;
    private cellEditModule!: CellEditService;

    @Event() beforeEdit: EventEmitter<Edition.SaveDataDetails>;
    onSave(e: CustomEvent<Edition.SaveData>): void {
        e.stopPropagation();
        if (this.editCell) {
            this.beforeEdit.emit({
                col: this.editCell.x,
                row: this.editCell.y,
                val: e.detail
            });
        }
        setTimeout(() => {
            this.cellEditModule.close();
        }, 0);
    }

    @Listen('focus', { target: 'parent' })
    onFocus(e: FocusEvent): void {
        console.log(e);
    }

    @Method()
    async doEdit(val: string|boolean = ''): Promise<void> {
        this.cellEditModule?.edit(val);
    }

    connectedCallback(): void {
        this.cellEditModule = new CellEditService();
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
            <revogr-text-editor value={this.editCell.val} onEdit={(e) => this.onSave(e)}/>
        </div>;
    }
}