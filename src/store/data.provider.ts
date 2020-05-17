import {ObservableMap} from '@stencil/store';
import {h, VNode} from '@stencil/core';

import {HyperFunc} from './index.stencil';
import {CellTemplateFunc, ColumnDataSchema, ColumnDataSchemaModel, DataSourceState} from "../interfaces";

type StoreMap = ObservableMap<DataSourceState>;
type PossibleCellFunc = CellTemplateFunc<VNode>|undefined;

class DataProviderObject {
  constructor(private store: StoreMap) {}

  public data(r: number, c: number): string {
    const {prop, model} = this.rowDataModel(r, c);
    return model[prop as number] || '';
  }

  public rowDataModel(r: number, c: number): ColumnDataSchemaModel {
    const prop = this.store.get('columns')[c]?.prop;
    const model = this.store.get('data')[r] || {};
    return {
      prop, model
    };
  }
}

class HeaderProviderObject {
  constructor(private store: StoreMap) {}

  public data(c: number): string {
    return this.getColumn(c)?.name || '';
  }

  public template(c: number): PossibleCellFunc {
    return this.getColumn(c)?.cellTemplate as PossibleCellFunc;
  }

  private getColumn(c: number): ColumnDataSchema|undefined {
    return this.store.get('columns')[c];
  }
}

export default class DataProvider {
  private dataProvider?: DataProviderObject;
  private columnProvider?: HeaderProviderObject;
  constructor(private store:  ObservableMap<DataSourceState>) {
    this.columnProvider = new HeaderProviderObject(this.store);
    this.dataProvider = new DataProviderObject(this.store);
  }

  public data(r: number, c: number): string|VNode {
    const tpl: CellTemplateFunc<VNode>|undefined = this.columnProvider.template(c);
    if (tpl) {
      return tpl(h as unknown as HyperFunc, this.dataProvider.rowDataModel(r, c));
    }
    return this.dataProvider.data(r, c);
  }

  public header(c: number): string {
    return this.columnProvider.data(c);
  }
}
