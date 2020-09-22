import reduce from 'lodash/reduce';
import orderBy from 'lodash/orderBy';

import DataStore from '../store/dataSource/data.store';
import {rowTypes} from '../store/storeTypes';
import DimensionProvider from './dimension.provider';
import {RevoGrid, Edition} from '../interfaces';
import DimensionRows = RevoGrid.DimensionRows;

type RowDataSources = {[T in DimensionRows]: DataStore<RevoGrid.DataType, RevoGrid.DimensionRows>};
export class DataProvider {
  public readonly stores: RowDataSources;
  constructor(private dimensionProvider: DimensionProvider) {
    this.stores = reduce(rowTypes, (sources: Partial<RowDataSources>, k: DimensionRows) => {
      sources[k] = new DataStore(k);
      return sources;
    }, {}) as RowDataSources;
  }
  setData(data: RevoGrid.DataType[], type: DimensionRows): void {
    this.stores[type].updateData([...data]);
    if (type === 'row') {
      this.dimensionProvider.setRealSize(data, type);
    } else {
      this.dimensionProvider.setPins(data, type);
    }
  }

  setCellData(data: Edition.BeforeSaveDataDetails): void {
    const items = this.stores[data.type].store.get('items');
    items[data.rowIndex][data.prop] = data.val;
    this.stores[data.type].setData({ items: [...items]  });
  }

  sort(order: 'asc'|'desc', prop: RevoGrid.ColumnProp): void {
    let items = this.stores['row'].store.get('items');
    items = orderBy(items, [prop], [order]);
    this.stores['row'].setData({ items: [...items]  });
  }
}
