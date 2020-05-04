import {ObservableMap} from '@stencil/store';
import {h, VNode} from '@stencil/core';

import {HyperFunc} from './index.stencil';

type StoreMap = ObservableMap<DataSourceState>;

class DataProviderObject {
  constructor(private store: StoreMap) {}

  public data(r: number, c: number): string {
    const {prop, model} = this.rowDataModel(r, c);
    return model[prop] || '';
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
    return this.store.get('columns')[c]?.name || '';
  }

  public template(c: number): CellTemplateFunc<VNode>|undefined {
    return this.store.get('columns')[c].cellTemplate as CellTemplateFunc<VNode>;
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
