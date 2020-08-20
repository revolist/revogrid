import {DataType} from '../interfaces';
import {updateData} from '../store/dataSource/data.store';
import {setViewport} from '../store/viewPort/viewport.store';
import {setRealSize} from '../store/dimension/dimension.store';

class DataProvider {
  setData(data: DataType[]): void {
    updateData({...data});

    const realCount: number = data.length;
    setViewport({ realCount }, 'row');
    setRealSize(realCount, 'row' );
  }
}

const dataProvider: DataProvider = new DataProvider();
export default dataProvider;