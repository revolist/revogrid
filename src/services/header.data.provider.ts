import {CellTemplateFunc, ColumnDataSchema, DataSourceState} from "../interfaces";
import {ObservableMap} from "@stencil/store";
import {VNode} from "@stencil/core";

type PossibleCellFunc = CellTemplateFunc<VNode>|undefined;
type StoreMap = ObservableMap<DataSourceState>;

export default class HeaderProviderObject {
    constructor(private dataSourceStore: StoreMap) {}

    public data(c: number): string {
        return this.getColumn(c)?.name || '';
    }

    public template(c: number): PossibleCellFunc {
        return this.getColumn(c)?.cellTemplate as PossibleCellFunc;
    }

    private getColumn(c: number): ColumnDataSchema|undefined {
        return this.dataSourceStore.get('columns')[c];
    }
}