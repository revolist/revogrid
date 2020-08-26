import {
  DataType,
  DimensionRowPin,
  DimensionRows,
  DimensionTypeRow
} from '../interfaces';
import DataStore from '../store/dataSource/data.store';
import reduce from "lodash/reduce";
import {rowTypes} from "../store/storeTypes";
import DimensionProvider from "./dimension.provider";

type RowDataSources = {[T in DimensionRows]: DataStore<DataType>};
export class DataProvider {
  public readonly stores: RowDataSources;
  constructor(private dimensionProvider: DimensionProvider) {
    this.stores = reduce(rowTypes, (sources: Partial<RowDataSources>, k: DimensionRows) => {
      sources[k] = new DataStore();
      return sources;
    }, {}) as RowDataSources;
  }
  setData(data: DataType[], type: DimensionTypeRow|DimensionRowPin): void {
    this.stores[type].updateData([...data]);
    if (type === 'row') {
      this.dimensionProvider.setRealSize(data, type);
    } else {
      this.dimensionProvider.setPins(data, type);
    }
  }
}
