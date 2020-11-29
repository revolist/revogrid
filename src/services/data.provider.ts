import reduce from 'lodash/reduce';
import orderBy from 'lodash/orderBy';
import keys from 'lodash/keys';
import toArray from 'lodash/toArray';
import size from 'lodash/size';

import DataStore from '../store/dataSource/data.store';
import {isRowType, rowTypes} from '../store/storeTypes';
import DimensionProvider from './dimension.provider';
import {RevoGrid, Edition} from '../interfaces';
import DimensionRows = RevoGrid.DimensionRows;

type RowDataSources = {[T in DimensionRows]: DataStore<RevoGrid.DataType, RevoGrid.DimensionRows>};
type Sorting = {[prop in  RevoGrid.ColumnProp]: 'asc'|'desc'};
export class DataProvider {
  public readonly stores: RowDataSources;
  private sorting: Sorting| null = null;
  constructor(private dimensionProvider: DimensionProvider) {
    this.stores = reduce(rowTypes, (sources: Partial<RowDataSources>, k: DimensionRows) => {
      sources[k] = new DataStore(k);
      return sources;
    }, {}) as RowDataSources;
  }

  get hasSorting(): boolean {
    return !!this.sorting;
  }

  setData(data: RevoGrid.DataType[], type: DimensionRows, doSorting = true): RevoGrid.DataType[] {
    let source = [...data];

    // sorting available for row type only
    if (type === 'row' && doSorting && this.sorting) {
      source = this.sortItems(source, this.sorting);
    }
    this.stores[type].updateData([...source]);
    if (type === 'row') {
      this.dimensionProvider.setData(source, type);
    } else {
      this.dimensionProvider.setColumns(type, undefined, true);
    }
    return source;
  }

  setCellData(data: Edition.BeforeSaveDataDetails): void {
    const items = this.stores[data.type].store.get('items');
    items[data.rowIndex][data.prop] = data.val;
    this.stores[data.type].setData({ items: [...items]  });
  }

  // sorting available for row type only
  sort(sorting: Sorting): void {
    if (!size(sorting)) {
      this.sorting = null;
      return;
    }
    this.sorting = sorting;

    const items = this.sortItems(this.stores['row'].store.get('items'), sorting);
    this.stores['row'].setData({ items });
  }

  private sortItems(data: RevoGrid.DataType[], sorting: Sorting): RevoGrid.DataType[] {
    return orderBy(data, keys(sorting), toArray(sorting));
  }

  refresh(type: RevoGrid.DimensionRows|'all' = 'all'): void {
    if (isRowType(type)) {
      this.refreshByDimension(type);
    }
    rowTypes.forEach((t: RevoGrid.DimensionRows) => this.refreshByDimension(t));
  }

  refreshByDimension(type: RevoGrid.DimensionRows) {
    const items = this.stores[type].store.get('items');
    this.stores[type].setData({ items: [...items]  });
  }
}
