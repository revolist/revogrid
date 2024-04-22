import reduce from 'lodash/reduce';
import { columnTypes, rowTypes } from '../store/storeTypes';
import ViewportStore, { ViewportStoreCollection } from '../store/viewport/viewport.store';
import { MultiDimensionType } from '..';
import { ViewportState } from '..';

export default class ViewportProvider {
  readonly stores: ViewportStoreCollection;
  constructor() {
    this.stores = reduce(
      [...rowTypes, ...columnTypes],
      (sources: Partial<ViewportStoreCollection>, k: MultiDimensionType) => {
        sources[k] = new ViewportStore(k);
        return sources;
      },
      {},
    ) as ViewportStoreCollection;
  }

  setViewport(type: MultiDimensionType, data: Partial<ViewportState>) {
    this.stores[type].setViewport(data);
  }
}
