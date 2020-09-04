import {h, VNode} from '@stencil/core';

import {DataSourceState} from "../../store/dataSource/data.store";
import {ObservableMap} from "@stencil/store";
import BeforeSaveDataDetails = Edition.BeforeSaveDataDetails;
import {Edition, RevoGrid} from "../../interfaces";

export interface ColumnServiceI {
    columns: RevoGrid.ColumnDataSchemaRegular[];
    setCellData(r: number, c: number, val: string): void;
    cellRenderer(r: number, c: number): string|VNode;
    isReadOnly(r: number, c: number): boolean;
    getCellData(r: number, c: number): string;
}
export default class ColumnService implements ColumnServiceI {
    private source: RevoGrid.ColumnDataSchemaRegular[] = [];
    get columns(): RevoGrid.ColumnDataSchemaRegular[] {
        return this.source;
    }
    set columns(source: RevoGrid.ColumnDataSchemaRegular[]) {
        this.source = source;
    }
    constructor(
        private dataStore: ObservableMap<DataSourceState<RevoGrid.DataType>>,
        columns: RevoGrid.ColumnDataSchemaRegular[]) {
        this.source = columns;
    }

    isReadOnly(r: number, c: number): boolean {
        const readOnly: RevoGrid.ReadOnlyFormat = this.columns[c]?.readonly;
        if (typeof readOnly === 'function') {
            return readOnly(r, c);
        }
        return readOnly;
    }

    cellRenderer(r: number, c: number): string|VNode {
        const tpl: RevoGrid.CellTemplateFunc<VNode> = this.columns[c]?.cellTemplate as RevoGrid.CellTemplateFunc<VNode>;
        if (tpl) {
            return tpl(h as unknown as RevoGrid.HyperFunc<VNode>, this.rowDataModel(r, c));
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
        const val = model[prop as number];
        return typeof val !== 'undefined' ? val : '';
    }

    getSaveData(r: number, c: number, val: string): BeforeSaveDataDetails {
        const { prop, model } = this.rowDataModel(r, c);
        return {
            prop,
            model,
            val
        }
    }

    rowDataModel(r: number, c: number): RevoGrid.ColumnDataSchemaModel {
        const prop: RevoGrid.ColumnProp|undefined = this.columns[c]?.prop;
        const data: RevoGrid.DataSource = this.dataStore.get('items');
        const model: RevoGrid.DataType = data[r] || {};
        return { prop, model, data };
    }
}


