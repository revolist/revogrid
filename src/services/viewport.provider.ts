import reduce from 'lodash/reduce';
import { columnTypes, rowTypes, type ViewportStoreCollection, ViewportStore } from '@store';
import type { MultiDimensionType } from '@type';
import type { ViewportState } from '@type';

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
