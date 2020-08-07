/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';

import {
  ColumnData, ColumnDataSchemaRegular,
  DataSourceState,
  DataType
} from '../../interfaces';
import {setStore} from '../../utils/store.utils';

const dataStore: ObservableMap<DataSourceState> = createStore({
  data: [],
  columns: [],
  columnsFlat: []
});

function setDataColumn(columns: ColumnData, columnsFlat: ColumnDataSchemaRegular[]): void {
  setStore(dataStore, { columns, columnsFlat });
}

function updateData(data: DataType[]): void {
  setStore(dataStore, { data });
}

export {setDataColumn, updateData};
export default dataStore;
