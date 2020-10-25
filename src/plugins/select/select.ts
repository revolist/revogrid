// import { RevoGrid } from '@revolist/revogrid/dist/types/interfaces';
// import { VNode } from '@revolist/revogrid/dist/types/stencil-public-runtime';

import { VNode } from "@stencil/core";
import { Edition, RevoGrid } from "../../interfaces";

interface SelectConfig extends RevoGrid.ColumnRegular {
    source?: (string|{[label: string]: any})[];
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
        // closeCallback: (focusNext?: boolean) => void
    ) {
    }

    element?: HTMLSelectElement|null;
    editCell?: Edition.EditCell;
    componentDidRender(): void {
        if (this.element) {
            this.element.value = this.editCell?.val;
        }
    }
    disconnectedCallback(): void {}
    render(h: RevoGrid.HyperFunc<VNode>) {
        const values = this.column?.source?.map(v => {
            if (typeof v === 'object') {
                return h('option', {
                    value: v[this.column?.valueKey]
                }, v[this.column?.labelKey]);
            }
            return h('option', {
                value: v
            }, v);
        });
        return h('select', {
            onChange: ({target}: {target: HTMLSelectElement}) => {
                this.saveCallback(target?.value);
            },
            onCancel: () => {
                console.log('ab');
            }
        }, values);
    }
}


export default class SelectColumnType {
    readonly editor: Edition.EditorCtr = SelectColumnEditor;

    cellTemplate = (h: RevoGrid.HyperFunc<VNode>, {model, prop}: RevoGrid.ColumnDataSchemaModel): (VNode|string)[] => {
        return [
            model[prop],
            h('i', {
                class: 'arrow-down',
                onClick: (e: MouseEvent) => {
                    const ev = new MouseEvent('dblclick', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    e.target.dispatchEvent(ev);
                }
            })
        ];
    };
}