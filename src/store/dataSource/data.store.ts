/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {
  ColumnDataSchemaRegular,
  DataType,
  DimensionColPin,
  DimensionRows
} from '../../interfaces';
import {setStore} from '../../utils/store.utils';

export type DataSourceState = {
      columnsFlat: ColumnDataSchemaRegular[];
    }
    &{[T in DimensionColPin]: ColumnDataSchemaRegular[]}
    &{[T in DimensionRows]: DataType[]};

const dataStore: ObservableMap<DataSourceState> = createStore({
  row: [],
  rowPinStart: [],
  rowPinEnd: [],

  columnsFlat: [],
  colPinStart: [],
  colPinEnd: []
});

function setDataColumn(
    columnsFlat: ColumnDataSchemaRegular[],
    pins: {[T in DimensionColPin]: ColumnDataSchemaRegular[]}
): void {
  setStore(dataStore, { columnsFlat, ...pins });
}

function updateData(data: DataType[], type: DimensionRows): void {
  setStore(dataStore, { [type]: data });
}

export {setDataColumn, updateData};
export default dataStore;

