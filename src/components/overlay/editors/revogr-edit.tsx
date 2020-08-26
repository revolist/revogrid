import {Component, Event, EventEmitter, Prop, h} from '@stencil/core';
import {ObservableMap} from '@stencil/store';

import {DimensionSettingsState, Edition, Selection} from '../../../interfaces';
import { getItemByIndex } from '../../../store/dimension/dimension.helpers';

@Component({
    tag: 'revogr-edit'
})
export class Edit {
    @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
    @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;
    @Prop() editCell: Edition.EditCell|null = null;

    @Event({ cancelable: true }) cellEdit: EventEmitter<Edition.SaveDataDetails>;
    @Event() closeEdit: EventEmitter;
    onSave(e: CustomEvent<Edition.SaveData>): void {
        e.stopPropagation();
        if (this.editCell) {
            this.cellEdit.emit({
                col: this.editCell.x,
                row: this.editCell.y,
                val: e.detail
            });
        }
        setTimeout(() => this.closeEdit.emit(), 0);
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