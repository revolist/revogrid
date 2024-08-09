import reduce from 'lodash/reduce';

import {
  isRowType,
  rowTypes,
  DataStore,
  getSourceItem,
  getVisibleSourceItem,
  Groups,
  setSourceByVirtualIndex,
  Trimmed,
} from '@store';
import DimensionProvider from './dimension.provider';
import type { GroupLabelTemplateFunc } from '../plugins/groupingRow/grouping.row.types';
import type {
  DataLookup,
  DimensionRows,
  DataType,
  BeforeSaveDataDetails,
} from '@type';

export type RowDataSources = {
  [T in DimensionRows]: DataStore<DataType, DimensionRows>;
};

/**
 * Data source provider
 */

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

  setData(
    data: DataType[],
    type: DimensionRows = 'rgRow',
    disableVirtualRows = false,
    grouping?: {
      depth: number;
      groups?: Groups;
      customRenderer?: GroupLabelTemplateFunc;
    },
    silent = false,
  ): DataType[] {
    // set rgRow data
    this.stores[type].updateData([...data], grouping, silent);

    // for pinned row no need virtual data
    const noVirtual = type !== 'rgRow' || disableVirtualRows;
    this.dimensionProvider.setData(data.length, type, noVirtual);
    return data;
  }

  getModel(virtualIndex: number, type: DimensionRows = 'rgRow') {
    const store = this.stores[type].store;
    return getSourceItem(store, virtualIndex);
  }

  setCellData(
    { type, rowIndex, prop, val }: BeforeSaveDataDetails,
    mutate = true,
  ) {
    const model = this.getModel(rowIndex, type);
    model[prop] = val;
    // apply data to source
    setSourceByVirtualIndex(
      this.stores[type].store,
      { [rowIndex]: model },
      mutate,
    );
  }

  setRangeData(data: DataLookup, type: DimensionRows) {
    const items: Record<number, DataType> = {};
    for (let rowIndex in data) {
      const oldModel = (items[rowIndex] = getSourceItem(
        this.stores[type].store,
        parseInt(rowIndex, 10),
      ));
      if (!oldModel) {
        continue;
      }
      for (let prop in data[rowIndex]) {
        oldModel[prop] = data[rowIndex][prop];
      }
    }
    // apply data to source
    setSourceByVirtualIndex(this.stores[type].store, items);
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

  setTrimmed(trimmed: Trimmed, type: DimensionRows = 'rgRow') {
    const store = this.stores[type];
    store.addTrimmed(trimmed);
    this.dimensionProvider.setTrimmed(trimmed, type);
    if (type === 'rgRow') {
      this.dimensionProvider.setData(
        getVisibleSourceItem(store.store).length,
        type,
      );
    }
  }
}
