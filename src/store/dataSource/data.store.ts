/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {ColumnDataSchemaRegular, DataSourceState, DataType, DimensionColPin} from '../../interfaces';
import {setStore} from '../../utils/store.utils';

const dataStore: ObservableMap<DataSourceState> = createStore({
  data: [],
  columnsFlat: [],
  colPinStart: [],
  colPinEnd: []
});

function setDataColumn(columnsFlat: ColumnDataSchemaRegular[], pins: {[T in DimensionColPin]: ColumnDataSchemaRegular[]}): void {
  setStore(dataStore, { columnsFlat, ...pins });
}

function updateData(data: DataType[]): void {
  setStore(dataStore, { data });
}

export {setDataColumn, updateData};
export default dataStore;
