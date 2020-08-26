import {h, VNode} from '@stencil/core';

import {
    CellTemplateFunc,
    ColumnDataSchemaModel,
    ColumnDataSchemaRegular, ColumnProp, DataSource, DataType, Edition,
    HyperFunc,
    ReadOnlyFormat
} from '../../interfaces';
import {DataSourceState} from "../../store/dataSource/data.store";
import {ObservableMap} from "@stencil/store";
import BeforeSaveDataDetails = Edition.BeforeSaveDataDetails;

export interface ColumnServiceI {
    columns: ColumnDataSchemaRegular[];
    setCellData(r: number, c: number, val: string): void;
    cellRenderer(r: number, c: number): string|VNode;
    isReadOnly(r: number, c: number): boolean;
    getCellData(r: number, c: number): string;
}
export default class ColumnService implements ColumnServiceI {
    private source: ColumnDataSchemaRegular[] = [];
    get columns(): ColumnDataSchemaRegular[] {
        return this.source;
    }
    set columns(source: ColumnDataSchemaRegular[]) {
        this.source = source;
    }
    constructor(private dataStore: ObservableMap<DataSourceState<DataType>>, columns: ColumnDataSchemaRegular[]) {
        this.source = columns;
    }

    isReadOnly(r: number, c: number): boolean {
        const readOnly: ReadOnlyFormat = this.columns[c]?.readonly;
        if (typeof readOnly === 'function') {
            return readOnly(r, c);
        }
        return readOnly;
    }

    cellRenderer(r: number, c: number): string|VNode {
        const tpl: CellTemplateFunc<VNode> = this.columns[c]?.cellTemplate as CellTemplateFunc<VNode>;
        if (tpl) {
            return tpl(h as unknown as HyperFunc<VNode>, this.rowDataModel(r, c));
        }
        return this.getCellData(r, c);
    }

    setCellData(r: number, c: number, val: string): void {
        const {data, model, prop} = this.rowDataModel(r, c);
        model[prop as number] = val;
        this.dataStore.set('items', [...data]);
    }

    getCellData(r: number, c: number): string {
        const {prop, model} = this.rowDataModel(r, c);
        return model[prop as number] || '';
    }

    getSaveData(r: number, c: number, val: string): BeforeSaveDataDetails {
        const { prop, model } = this.rowDataModel(r, c);
        return {
            prop,
            model,
            val
        }
    }

    rowDataModel(r: number, c: number): ColumnDataSchemaModel {
        const prop: ColumnProp|undefined = this.columns[c]?.prop;
        const data: DataSource = this.dataStore.get('items');
        const model: DataType = data[r] || {};
        return { prop, model, data };
    }
}


