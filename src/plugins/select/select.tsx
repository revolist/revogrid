// import { RevoGrid } from '@revolist/revogrid/dist/types/interfaces';
// import { VNode } from '@revolist/revogrid/dist/types/stencil-public-runtime';

import { VNode, h } from "@stencil/core";
import { Edition, RevoGrid } from "../../interfaces";
import keyBy from 'lodash/keyBy';

interface SelectConfig extends RevoGrid.ColumnRegular {
    source?: (string|{[label: string]: any})[];
    sourceLookup?: Record<string, any>;
    labelKey?: string;
    valueKey?: string;
}

class SelectColumnEditor implements Edition.EditorBase {
    constructor(
        // column data
        private column: SelectConfig,
        // to save changes
        private saveCallback: (value: Edition.SaveData, preventFocus?: boolean) => void,
        // to close editor, if focusNext true, after close editor focus on next cell
        // private closeCallback: (focusNext?: boolean) => void
    ) {
    }

    element?: HTMLSelectElement|null;
    editCell?: Edition.EditCell;
    componentDidRender(): void {
        if (this.element) {
            this.element.value = this.editCell?.val;
            // this.element.setAttribute('size', this.element.options.length.toString());
        }
    }
    disconnectedCallback(): void {
        // console.log('disconnected');
    }
    render(h: RevoGrid.HyperFunc<VNode>) {
        return <revo-dropdown 
            source={this.column?.source}
            dataId={this.column?.valueKey}
            dataLabel={this.column?.labelKey}
            autocomplete={true}
            autoFocus={true}
            max-height="300"
            onClose={() => {
                // console.log('close');
                // this.closeCallback(false);
            }}
            onChangeValue={({detail: {val: {value}}}: CustomEvent<{val: {label: string, value: any}}>) => {
            this.saveCallback(value);
        }}/>;
    }
}


export default class SelectColumnType {
    readonly editor: Edition.EditorCtr = SelectColumnEditor;

    beforeSetup = (col: SelectConfig) => {
        if (!col.source) {
            return;
        }
        
        col.sourceLookup = keyBy(col.source, col.valueKey);
    };

    cellTemplate = (_h: RevoGrid.HyperFunc<VNode>, {model, prop, column}: RevoGrid.ColumnDataSchemaModel): (VNode|string)[] => {
        let col = column as SelectConfig;
        let val = model[prop];
        if (col.labelKey && col.sourceLookup) {
            val = col.sourceLookup[val][col.labelKey];
        }
        return [
            val,
            <i class='arrow-down' onClick = {e => {
                console.log('click');
                const ev = new MouseEvent('dblclick', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                e.target.dispatchEvent(ev);
            }}/>
        ];
    };
}