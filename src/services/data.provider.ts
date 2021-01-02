import reduce from 'lodash/reduce';

import DataStore, { getSourceItem, getVisibleSourceItem, setSourceByVirtualIndex } from '../store/dataSource/data.store';
import {isRowType, rowTypes} from '../store/storeTypes';
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

  setData(data: RevoGrid.DataType[], type: DimensionRows): RevoGrid.DataType[] {
    // set row data
    this.stores[type].updateData([...data]);
    this.dimensionProvider.setData(data, type, type !== 'row');
    return data;
  }

  setCellData(data: Edition.BeforeSaveDataDetails) {
    const store = this.stores[data.type].store;
    const model =  getSourceItem(store, data.rowIndex);
    model[data.prop] = data.val;
    setSourceByVirtualIndex(store, { [data.rowIndex]: model });
  }


  refresh(type: RevoGrid.DimensionRows|'all' = 'all') {
    if (isRowType(type)) {
      this.updateItems(type);
    }
    rowTypes.forEach((t: RevoGrid.DimensionRows) => this.updateItems(t));
  }

  updateItems(type: RevoGrid.DimensionRows) {
    const items = this.stores[type].store.get('items');
    this.stores[type].setData({ items: [...items]  });
  }

  setTrimmed(trimmed: Record<number, boolean>, type: RevoGrid.DimensionRows) {
    const store = this.stores[type];
    store.setData({ trimmed });
    if (type === 'row') {
      this.dimensionProvider.setData(getVisibleSourceItem(store.store), type);
    }
  }
}
