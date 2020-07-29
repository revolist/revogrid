/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';
import size from 'lodash/size';
import reduce from 'lodash/reduce';

import {setViewport} from './viewport.store';
import {setRealSize} from './dimension.store';
import {
  ColumnData,
  ColumnDataSchema,
  ColumnDataSchemaGrouping,
  ColumnDataSchemaRegular,
  DataSourceState,
  DataType
} from '../interfaces';
import {setStore} from './helpers';

const dataStore: ObservableMap<DataSourceState> = createStore({
  data: [],
  columns: [],
  columnsFlat: []
});

function getColumns(columns: ColumnData): ColumnDataSchemaRegular[] {
  return reduce(columns, (res: ColumnDataSchemaRegular[], colData: ColumnDataSchema) => {
    if (isColGrouping(colData)) {
      res.push(...getColumns(colData.children));
    } else {
      res.push(colData);
    }
    return res;
  }, []);
}

function isColGrouping(colData: ColumnDataSchemaGrouping | ColumnDataSchemaRegular): colData is ColumnDataSchemaGrouping {
  return !!(colData as ColumnDataSchemaGrouping).children;
}

function setDataColumn(columns: ColumnData): number {
  const columnsFlat: ColumnDataSchemaRegular[] = getColumns(columns);
  setStore(dataStore, {
    columns,
    columnsFlat
  });
  return columnsFlat.length;
}

function setData(data: DataType[]): void {
  const rows: number = size(data);
  updateData(data);
  setViewport({ realCount: rows }, 'row');
  setRealSize(rows, 'row' );
}

function updateData(data: DataType[]): void {
  setStore(dataStore, { data });
}

export {setDataColumn, setData, updateData};
export default dataStore;
