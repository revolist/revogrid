/**
* Storing initial data and column information
*/

import {createStore, ObservableMap} from '@stencil/store';
import reduce from 'lodash/reduce';

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

function updateData(data: DataType[]): void {
  setStore(dataStore, { data });
}

export {setDataColumn, updateData};
export default dataStore;
