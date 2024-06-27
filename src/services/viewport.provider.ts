import reduce from 'lodash/reduce';
import { columnTypes, rowTypes, ViewportStore } from '@store';
import type { MultiDimensionType } from '@type';
import type { ViewportState } from '@type';

type ViewportStoreCollection = {
  [T in MultiDimensionType]: ViewportStore;
};


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
