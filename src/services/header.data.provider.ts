import {CellTemplateFunc, ColumnDataSchemaRegular, DataSourceState} from '../interfaces';
import {ObservableMap} from '@stencil/store';
import {VNode} from '@stencil/core';

type PossibleCellFunc = CellTemplateFunc<VNode>|undefined;
type StoreMap = ObservableMap<DataSourceState>;

export default class HeaderProviderObject {
    constructor(private dataSourceStore: StoreMap) {}

    data(c: number): string {
        return this.getColumn(c)?.name || '';
    }

    template(c: number): PossibleCellFunc {
        return this.getColumn(c)?.cellTemplate as PossibleCellFunc;
    }

    getColumn(c: number): ColumnDataSchemaRegular|undefined {
        return this.dataSourceStore.get('columnsFlat')[c];
    }
}