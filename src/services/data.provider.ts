import {DataType, DimensionRowPin, DimensionTypeRow} from '../interfaces';
import {updateData} from '../store/dataSource/data.store';
import dimensionProvider from "./dimension.provider";

class DataProvider {
  setData(data: DataType[], type: DimensionTypeRow|DimensionRowPin): void {
    updateData({...data}, type);
    if (type === 'row') {
      dimensionProvider.setRealSize(data, type);
    } else {
      dimensionProvider.setPins(data, type);
    }
  }
}

const dataProvider: DataProvider = new DataProvider();
export default dataProvider;