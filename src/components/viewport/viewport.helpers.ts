/** Collect data for pinned columns in required @ViewportProps format */
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { UUID } from '../../utils/consts';
import { ViewportSpace } from './viewport.interfaces';
import { DataSourceState, getVisibleSourceItem } from '../../store/dataSource/data.store';
import { columnTypes, rowTypes } from '../../store/storeTypes';

import ViewportProps = ViewportSpace.ViewportProps;
import ViewportData = ViewportSpace.ViewportData;
import SlotType = ViewportSpace.SlotType;
import Properties = ViewportSpace.Properties;
import HeaderProperties = ViewportSpace.HeaderProperties;
export interface ViewportColumn {
  colType: RevoGrid.DimensionCols;
  position: Selection.Cell;

  contentHeight: number;
  uuid: string;
  fixWidth?: boolean;

  viewports: { [T in RevoGrid.MultiDimensionType]: Observable<RevoGrid.ViewportState> };
  dimensions: { [T in RevoGrid.MultiDimensionType]: Observable<RevoGrid.DimensionSettingsState> };
  rowStores: { [T in RevoGrid.DimensionRows]: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>> };
  colStore: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;
  onHeaderResize?(e: CustomEvent<RevoGrid.ViewSettingSizeProp>): void;
  onResizeViewport?(e: CustomEvent<RevoGrid.ViewPortResizeEvent>): void;
}

export function gatherColumnData(data: ViewportColumn): ViewportProps {
  const parent: string = data.uuid;
  const realSize = data.dimensions[data.colType].get('realSize');
  const prop: Properties = {
    contentWidth: realSize,
    class: data.colType,
    [`${UUID}`]: data.uuid,
    contentHeight: data.contentHeight,
    key: data.colType,
    onResizeViewport: data.onResizeViewport,
  };
  if (data.fixWidth) {
    prop.style = { minWidth: `${realSize}px` };
  }
  const headerProp: HeaderProperties = {
    parent,
    colData: getVisibleSourceItem(data.colStore),
    dimensionCol: data.dimensions[data.colType],
    groups: data.colStore.get('groups'),
    groupingDepth: data.colStore.get('groupingDepth'),
    onHeaderResize: data.onHeaderResize,
  };

  return {
    prop,
    position: data.position,
    headerProp,
    parent,
    viewportCol: data.viewports[data.colType],
    dataPorts: dataViewPort(data),
  };
}

function dataPartition(data: ViewportColumn, type: RevoGrid.DimensionRows, slot: SlotType, fixed?: boolean): ViewportData {
  let lastCell = getLastCell(data, type);
  const dataPart: ViewportData = {
    colData: data.colStore,
    viewportCol: data.viewports[data.colType],
    viewportRow: data.viewports[type],
    lastCell,
    slot,
    type,
    canDrag: !fixed,
    position: data.position,
    uuid: `${data.uuid}-${data.position.x}-${data.position.y}`,
    dataStore: data.rowStores[type],
    dimensionCol: data.dimensions[data.colType],
    dimensionRow: data.dimensions[type],
  };

  if (fixed) {
    dataPart.style = { height: `${data.dimensions[type].get('realSize')}px` };
  }
  return dataPart;
}

/** Collect Row data */
function dataViewPort(data: ViewportColumn): ViewportData[] {
  const viewports: ViewportData[] = [];
  const slots: { [key in RevoGrid.DimensionRows]: SlotType } = {
    rowPinStart: 'header',
    row: 'content',
    rowPinEnd: 'footer',
  };
  let y: number = 0;
  rowTypes.forEach(type => {
    // filter out empty sources
    if (data.viewports[type].get('realCount') || type === 'row') {
      viewports.push(
        dataPartition(
          {
            ...data,
            position: { ...data.position, y },
          },
          type,
          slots[type],
          type !== 'row',
        ),
      );
      y++;
    }
  });
  return viewports;
}

/** Receive last visible in viewport by required type */
function getLastCell(data: ViewportColumn, rowType: RevoGrid.MultiDimensionType): Selection.Cell {
  return {
    x: data.viewports[data.colType].get('realCount'),
    y: data.viewports[rowType].get('realCount'),
  };
}

export function getStoresCoordinates(
  columnStores: { [T in RevoGrid.DimensionCols]: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>> },
  rowStores: { [T in RevoGrid.DimensionRows]: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>> },
) {
  let x = 0;
  let y = 0;
  let stores: Partial<{ [T in RevoGrid.MultiDimensionType]: number }> = {};
  columnTypes.forEach(v => {
    const colStore = columnStores[v];
    if (colStore.get('items').length) {
      stores[v] = x;
      x++;
    }
  });

  rowTypes.forEach(v => {
    const rowStore = rowStores[v];
    if (rowStore.get('items').length) {
      stores[v] = y;
      y++;
    }
  });
  return stores;
}
