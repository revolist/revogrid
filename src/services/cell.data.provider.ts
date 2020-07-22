import {ColumnDataSchemaModel, DataSourceState} from "../interfaces";
import {ObservableMap} from "@stencil/store";

type StoreMap = ObservableMap<DataSourceState>;

export default class DataProviderObject {
    constructor(private dataSourceStore: StoreMap) {}

    public data(r: number, c: number): string {
        const {prop, model} = this.rowDataModel(r, c);
        return model[prop as number] || '';
    }

    public rowDataModel(r: number, c: number): ColumnDataSchemaModel {
        const prop = this.dataSourceStore.get('columns')[c]?.prop;
        const model = this.dataSourceStore.get('data')[r] || {};
        return {
            prop, model
        };
    }
}