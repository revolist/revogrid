import reduce from 'lodash/reduce';
import { columnTypes, rowTypes } from '../store/storeTypes';
import ViewportStore from '../store/viewPort/viewport.store';
import { RevoGrid } from '../interfaces';

export type ViewportStores = { [T in RevoGrid.MultiDimensionType]: ViewportStore };
export default class ViewportProvider {
  readonly stores: ViewportStores;
  constructor() {
    this.stores = reduce(
      [...rowTypes, ...columnTypes],
      (sources: Partial<ViewportStores>, k: RevoGrid.MultiDimensionType) => {
        sources[k] = new ViewportStore(k);
        return sources;
      },
      {},
    ) as ViewportStores;
  }

  setViewport(type: RevoGrid.MultiDimensionType, data: Partial<RevoGrid.ViewportState>): void {
    this.stores[type].setViewport(data, type);
  }
}
