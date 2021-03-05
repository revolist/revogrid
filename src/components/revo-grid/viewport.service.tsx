import { RevoGrid, Selection } from '../../interfaces';
import DimensionProvider from '../../services/dimension.provider';
import SelectionStoreConnector, { EMPTY_INDEX } from '../../services/selection.store.connector';
import ViewportProvider from '../../services/viewport.provider';
import { getVisibleSourceItem } from '../../store/dataSource/data.store';
import { columnTypes, rowTypes } from '../../store/storeTypes';
import { UUID } from '../../utils/consts';
import { OrdererService } from '../order/orderRenderer';
import GridScrollingService from './viewport.scrolling.service';
import { CONTENT_SLOT, FOOTER_SLOT, getLastCell, HEADER_SLOT } from './viewport.helpers';
import { HeaderProperties, SlotType, ViewportColumn, ViewportData, ViewportProps } from './viewport.interfaces';
import ColumnDataProvider, { ColumnDataSources } from '../../services/column.data.provider';
import { DataProvider, RowDataSources } from '../../services/data.provider';

export default abstract class GridRenderService {
  abstract columnProvider: ColumnDataProvider;
  abstract dataProvider: DataProvider;
  abstract dimensionProvider: DimensionProvider;
  abstract viewportProvider: ViewportProvider;
  protected abstract uuid: string | null;

  protected abstract scrollingService: GridScrollingService;
  protected orderService: OrdererService;
  protected selectionStoreConnector: SelectionStoreConnector;

  /**
   * Transform data from stores and apply it to different components
   */
  protected getViewportColumnData(contentHeight: number): ViewportProps[] {
    const columns: ViewportProps[] = [];
    let x = 0; // we increase x only if column present
    columnTypes.forEach(val => {
      const colStore = this.columnProvider.stores[val].store;
      // only columns that have data show
      if (!colStore.get('items').length) {
        return;
      }
      const column: ViewportColumn = {
        colType: val,
        position: { x, y: 1 },

        contentHeight,
        fixWidth: val !== 'col',
        uuid: `${this.uuid}-${x}`,

        viewports: this.viewportProvider.stores,
        dimensions: this.dimensionProvider.stores,
        rowStores: this.dataProvider.stores,

        colStore,
        onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) => this.dimensionProvider?.setDimensionSize(val, e.detail),
      };
      if (val === 'col') {
        column.onResizeViewport = (e: CustomEvent<RevoGrid.ViewPortResizeEvent>) => this.viewportProvider?.setViewport(e.detail.dimension, { virtualSize: e.detail.size });
      }
      const colData = this.gatherColumnData(column);
      // register selection store for column
      const columnSelectionStore = this.selectionStoreConnector.registerColumn(colData.position.x).store;

      // render per each column data collections vertically
      const dataPorts = this.dataViewPort(column).reduce<ViewportData[]>((r, row) => {
        // register selection store for segment
        const segmentSelection = this.selectionStoreConnector.register(row.position);
        segmentSelection.setLastCell(row.lastCell);

        // register selection store for row
        const rowSelectionStore = this.selectionStoreConnector.registerRow(row.position.y).store;
        r.push({
          ...row,
          rowSelectionStore,
          segmentSelectionStore: segmentSelection.store,
          ref: (e: Element) => this.selectionStoreConnector.registerSection(e),
          onSetRange: e => segmentSelection.setRangeArea(e.detail),
          onSetTempRange: e => segmentSelection.setTempArea(e.detail),
          onFocusCell: e => {
            segmentSelection.clearFocus();
            this.selectionStoreConnector.focus(segmentSelection, e.detail);
          },
        });
        return r;
      }, []);
      columns.push({
        ...colData,
        columnSelectionStore,
        dataPorts,
      });
      x++;
    });
    return columns;
  }

  viewportConnectedCallback() {
    this.selectionStoreConnector = new SelectionStoreConnector();
  }

  /** Collect Column data */
  private gatherColumnData(data: ViewportColumn) {
    const parent: string = data.uuid;
    const realSize = data.dimensions[data.colType].store.get('realSize');
    const prop: Record<string, any> = {
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
      dimensionCol: data.dimensions[data.colType].store,
      groups: data.colStore.get('groups'),
      groupingDepth: data.colStore.get('groupingDepth'),
      onHeaderResize: data.onHeaderResize,
    };

    return {
      prop,
      position: data.position,
      headerProp,
      parent,
      viewportCol: data.viewports[data.colType].store,
    };
  }

  /** Collect Row data */
  private dataViewPort(data: ViewportColumn) {
    const slots: { [key in RevoGrid.DimensionRows]: SlotType } = {
      rowPinStart: HEADER_SLOT,
      row: CONTENT_SLOT,
      rowPinEnd: FOOTER_SLOT,
    };

    // y position for selection
    let y = 0;
    return rowTypes.reduce((r, type) => {
      // filter out empty sources, we still need to return source to keep slot working
      const isPresent = data.viewports[type].store.get('realCount') || type === 'row';
      const col = {
        ...data,
        position: { ...data.position, y: isPresent ? y : EMPTY_INDEX },
      };
      r.push(
        this.dataPartition(
          col,
          type,
          slots[type],
          type !== 'row', // is fixed
        ),
      );
      if (isPresent) {
        y++;
      }
      return r;
    }, []);
  }

  private dataPartition(data: ViewportColumn, type: RevoGrid.DimensionRows, slot: SlotType, fixed?: boolean) {
    return {
      colData: data.colStore,
      viewportCol: data.viewports[data.colType].store,
      viewportRow: data.viewports[type].store,
      lastCell: getLastCell(data, type),
      slot,
      type,
      canDrag: !fixed,
      position: data.position,
      uuid: `${data.uuid}-${data.position.x}-${data.position.y}`,
      dataStore: data.rowStores[type].store,
      dimensionCol: data.dimensions[data.colType].store,
      dimensionRow: data.dimensions[type].store,
      style: fixed ? { height: `${data.dimensions[type].store.get('realSize')}px` } : undefined,
    };
  }

  private getStoresCoordinates(columnStores: ColumnDataSources, rowStores: RowDataSources) {
    let x = 0;
    let y = 0;
    let stores: Partial<Record<RevoGrid.MultiDimensionType, number>> = {};
    columnTypes.forEach(v => {
      const colStore = columnStores[v].store;
      if (colStore.get('items').length) {
        stores[v] = x;
        x++;
      }
    });

    rowTypes.forEach(v => {
      const rowStore = rowStores[v].store;
      if (rowStore.get('items').length) {
        stores[v] = y;
        y++;
      }
    });
    return stores;
  }

  scrollToCell(cell: Partial<Selection.Cell>) {
    for (let key in cell) {
      const coordinate = cell[key as keyof Selection.Cell];
      this.scrollingService.onScroll({ dimension: key === 'x' ? 'col' : 'row', coordinate });
    }
  }

  /**
   * Clear current grid focus
   */
  clearFocused() {
    this.selectionStoreConnector.clearAll();
  }

  setEdit(rowIndex: number, colIndex: number, colType: RevoGrid.DimensionCols, rowType: RevoGrid.DimensionRows) {
    const stores = this.getStoresCoordinates(this.columnProvider.stores, this.dataProvider.stores);
    const storeCoordinate = {
      x: stores[colType],
      y: stores[rowType],
    };
    this.selectionStoreConnector?.setEditByCell(storeCoordinate, { x: colIndex, y: rowIndex });
  }
}
