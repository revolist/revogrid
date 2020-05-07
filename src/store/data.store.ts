/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';
import size from 'lodash/size';

import DataSource from './data.manager';
import {setViewport} from './viewport.store';
import {setRealSize} from './dimension.store';
import {ColumnData, DataSourceState, DataType} from "../interfaces";

const store: ObservableMap<DataSourceState> = createStore({
  data: [],
  columns: []
});

const dataStore: DataSource = new DataSource(store);

function setColumn(data: ColumnData): void {
  const cols: number = size(data);
  dataStore.setColumn(data);

  setViewport({ realCount: cols }, 'col');
  setRealSize(cols, 'col' );
}
function setData(data: DataType[]): void {
  const rows: number = size(data);
  dataStore.setData(data);

  setViewport({ realCount: rows }, 'row');
  setRealSize(rows, 'row' );
}

export {setColumn, setData};
export default dataStore;
