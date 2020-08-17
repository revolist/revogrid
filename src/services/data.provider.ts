import {ObservableMap} from '@stencil/store';

import {
  ColumnDataSchemaModel, ColumnProp,
  DataSource, DataSourceState, DataType, Pin,
} from '../interfaces';
import dataStore, {updateData} from '../store/dataSource/data.store';
import {setViewport} from '../store/viewPort/viewport.store';
import {setRealSize} from '../store/dimension/dimension.store';
import columnProvider from "./column.data.provider";

class DataProvider {
  constructor(private dataSourceStore:  ObservableMap<DataSourceState>) {
  }

  setData(data: DataType[]): void {
    updateData({...data});

    const realCount: number = data.length;
    setViewport({ realCount }, 'row');
    setRealSize(realCount, 'row' );
  }

  getCellData(r: number, c: number, pin?: Pin): string {
    const {prop, model} = this.rowDataModel(r, c, pin);
    return model[prop as number] || '';
  }

  setCellData(r: number, c: number, val: string): void {
    const {data, model, prop} = this.rowDataModel(r, c);
    model[prop as number] = val;
    updateData({...data});
  }


  rowDataModel(r: number, c: number, pin?: Pin): ColumnDataSchemaModel {
    const prop: ColumnProp = pin ? columnProvider.getPin(c, pin)?.prop : columnProvider.getColumn(c)?.prop;
    const data: DataSource = this.dataSourceStore.get('data');
    const model: DataType = data[r] || {};
    return { prop, model, data };
  }

  isReadOnly(r: number, c: number, pin?: Pin): boolean {
    return columnProvider.isReadOnly(r, c, pin);
  }
}

const dataProvider: DataProvider = new DataProvider(dataStore);
export default dataProvider;