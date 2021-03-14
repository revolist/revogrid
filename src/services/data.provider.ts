import reduce from 'lodash/reduce';

import DataStore, { getSourceItem, getVisibleSourceItem, Groups, setSourceByVirtualIndex } from '../store/dataSource/data.store';
import { isRowType, rowTypes } from '../store/storeTypes';
import DimensionProvider from './dimension.provider';
import { RevoGrid, Edition } from '../interfaces';
import { Trimmed } from '../plugins/trimmed/trimmed.plugin';
import DimensionRows = RevoGrid.DimensionRows;
import DataType = RevoGrid.DataType;

export type RowDataSources = { [T in DimensionRows]: DataStore<DataType, DimensionRows> };

export class DataProvider {
  public readonly stores: RowDataSources;
  constructor(private dimensionProvider: DimensionProvider) {
    this.stores = reduce(
      rowTypes,
      (sources: Partial<RowDataSources>, k: DimensionRows) => {
        sources[k] = new DataStore(k);
        return sources;
      },
      {},
    ) as RowDataSources;
  }

  setData(data: DataType[], type: DimensionRows = 'rgRow', grouping?: { depth: number; groups?: Groups }, silent = false): DataType[] {
    // set rgRow data
    this.stores[type].updateData([...data], grouping, silent);
    this.dimensionProvider.setData(data, type, type !== 'rgRow');
    return data;
  }

  setCellData({ type, rowIndex, prop, val }: Edition.BeforeSaveDataDetails) {
    const store = this.stores[type].store;
    const model = getSourceItem(store, rowIndex);
    model[prop] = val;
    setSourceByVirtualIndex(store, { [rowIndex]: model });
  }

  refresh(type: DimensionRows | 'all' = 'all') {
    if (isRowType(type)) {
      this.refreshItems(type);
    }
    rowTypes.forEach((t: DimensionRows) => this.refreshItems(t));
  }

  refreshItems(type: DimensionRows = 'rgRow') {
    const items = this.stores[type].store.get('items');
    this.stores[type].setData({ items: [...items] });
  }

  setGrouping({ depth }: { depth: number }, type: DimensionRows = 'rgRow') {
    this.stores[type].setData({ groupingDepth: depth });
  }

  setTrimmed(trimmed: Partial<Trimmed>, type: DimensionRows = 'rgRow') {
    const store = this.stores[type];
    store.addTrimmed(trimmed);
    if (type === 'rgRow') {
      this.dimensionProvider.setData(getVisibleSourceItem(store.store), type);
    }
  }
}
