import reduce from "lodash/reduce";
import {columnTypes, rowTypes} from "../store/storeTypes";
import {MultiDimensionType, ViewportState} from "../interfaces";
import ViewportStore from "../store/viewPort/viewport.store";

type ViewportStores = {[T in MultiDimensionType]: ViewportStore};
export default class ViewportProvider {
    readonly stores: ViewportStores;
    constructor() {
        this.stores = reduce([...rowTypes, ...columnTypes], (sources: Partial<ViewportStores>, k: MultiDimensionType) => {
            sources[k] = new ViewportStore();
            return sources;
        }, {}) as ViewportStores;
    }

    setViewport(dimensionType: MultiDimensionType, data: Partial<ViewportState>): void {
        this.stores[dimensionType].setViewport(data);
    }
}
