import DataStore from '../store/dataSource/data.store';
import reduce from "lodash/reduce";
import {rowTypes} from "../store/storeTypes";
import DimensionProvider from "./dimension.provider";
import {RevoGrid} from "../interfaces";

type RowDataSources = {[T in RevoGrid.DimensionRows]: DataStore<RevoGrid.DataType>};
export class DataProvider {
  public readonly stores: RowDataSources;
  constructor(private dimensionProvider: DimensionProvider) {
    this.stores = reduce(rowTypes, (sources: Partial<RowDataSources>, k: RevoGrid.DimensionRows) => {
      sources[k] = new DataStore();
      return sources;
    }, {}) as RowDataSources;
  }
  setData(data: RevoGrid.DataType[], type: RevoGrid.DimensionTypeRow|RevoGrid.DimensionRowPin): void {
    this.stores[type].updateData([...data]);
    if (type === 'row') {
      this.dimensionProvider.setRealSize(data, type);
    } else {
      this.dimensionProvider.setPins(data, type);
    }
  }
}
