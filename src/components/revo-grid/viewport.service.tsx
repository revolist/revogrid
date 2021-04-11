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
import ColumnDataProvider from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';

type StoresMapping<T> = { [xOrY: number]: Partial<T> };

type Config = {
  columnProvider: ColumnDataProvider;
  dataProvider: DataProvider;
  dimensionProvider: DimensionProvider;
  viewportProvider: ViewportProvider;
  uuid: string | null;
  scrollingService: GridScrollingService;
  orderService: OrdererService;
  selectionStoreConnector: SelectionStoreConnector;
};



export type FocusedData = {
  model: any,
  cell: Selection.Cell;
  colType: RevoGrid.DimensionCols;
  rowType: RevoGrid.DimensionRows;
  column?: RevoGrid.ColumnRegular;
};


export default class ViewportService {
  readonly columns: ViewportProps[];
  readonly storesByType: Partial<Record<RevoGrid.MultiDimensionType, number>> = {};
  readonly storesXToType: StoresMapping<RevoGrid.DimensionCols> = {};
  readonly storesYToType: StoresMapping<RevoGrid.DimensionRows> = {};
  constructor(private sv: Config, contentHeight: number) {
    this.sv.selectionStoreConnector?.beforeUpdate();
    this.columns = this.getViewportColumnData(contentHeight);
    this.sv.scrollingService?.unregister();
  }

  /**
   * Transform data from stores and apply it to different components
   */
  private getViewportColumnData(contentHeight: number): ViewportProps[] {
    const columns: ViewportProps[] = [];
    let x = 0; // we increase x only if column present
    columnTypes.forEach(val => {
      const colStore = this.sv.columnProvider.stores[val].store;
      // only columns that have data show
      if (!colStore.get('items').length) {
        return;
      }
      const column: ViewportColumn = {
        colType: val,
        position: { x, y: 1 },

        contentHeight,
        fixWidth: val !== 'rgCol',
        uuid: `${this.sv.uuid}-${x}`,

        viewports: this.sv.viewportProvider.stores,
        dimensions: this.sv.dimensionProvider.stores,
        rowStores: this.sv.dataProvider.stores,

        colStore,
        onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) => this.sv.dimensionProvider?.setDimensionSize(val, e.detail),
      };
      if (val === 'rgCol') {
        column.onResizeViewport = (e: CustomEvent<RevoGrid.ViewPortResizeEvent>) => this.sv.viewportProvider?.setViewport(e.detail.dimension, { virtualSize: e.detail.size });
      }
      const colData = this.gatherColumnData(column);
      const columnSelectionStore = this.registerCol(colData.position.x, val);

      // render per each column data collections vertically
      const dataPorts = this.dataViewPort(column).reduce<ViewportData[]>((r, rgRow) => {
        // register selection store for Segment
        const segmentSelection = this.registerSegment(rgRow.position);
        segmentSelection.setLastCell(rgRow.lastCell);

        // register selection store for Row
        const rowSelectionStore = this.registerRow(rgRow.position.y, rgRow.type);
        const rowDef: ViewportData = {
          ...rgRow,
          rowSelectionStore,
          segmentSelectionStore: segmentSelection.store,
          ref: (e: Element) => this.sv.selectionStoreConnector.registerSection(e),
          onSetRange: e => segmentSelection.setRangeArea(e.detail),
          onSetTempRange: e => segmentSelection.setTempArea(e.detail),
          onFocusCell: e => {
            segmentSelection.clearFocus();
            this.sv.selectionStoreConnector.focus(segmentSelection, e.detail);
          },
        };
        r.push(rowDef);
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

  /** register selection store for Segment */
  private registerSegment(position: Selection.Cell) {
    return this.sv.selectionStoreConnector.register(position);
  }

  /** register selection store for Row */
  private registerRow(y: number, type: RevoGrid.DimensionRows) {
    // link to position
    this.storesByType[type] = y;
    this.storesYToType[y] = type;
    return this.sv.selectionStoreConnector.registerRow(y).store;
  }

  /** register selection store for Column */
  private registerCol(x: number, type: RevoGrid.DimensionCols) {
    // link to position
    this.storesByType[type] = x;
    this.storesXToType[x] = type;
    return this.sv.selectionStoreConnector.registerColumn(x).store
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
      rgRow: CONTENT_SLOT,
      rowPinEnd: FOOTER_SLOT,
    };

    // y position for selection
    let y = 0;
    return rowTypes.reduce((r, type) => {
      // filter out empty sources, we still need to return source to keep slot working
      const isPresent = data.viewports[type].store.get('realCount') || type === 'rgRow';
      const rgCol = {
        ...data,
        position: { ...data.position, y: isPresent ? y : EMPTY_INDEX },
      };
      r.push(
        this.dataPartition(
          rgCol,
          type,
          slots[type],
          type !== 'rgRow', // is fixed
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

  scrollToCell(cell: Partial<Selection.Cell>) {
    for (let key in cell) {
      const coordinate = cell[key as keyof Selection.Cell];
      this.sv.scrollingService.onScroll({ dimension: key === 'x' ? 'rgCol' : 'rgRow', coordinate });
    }
  }

  /**
   * Clear current grid focus
   */
  clearFocused() {
    this.sv.selectionStoreConnector.clearAll();
  }

  clearEdit() {
    this.sv.selectionStoreConnector.setEdit(false);
  }

  getFocused(): FocusedData | null {
    const focused = this.sv.selectionStoreConnector.focusedStore;
    if (!focused) {
      return null;
    }
    const colType = this.storesXToType[focused.position.x];
    const column = this.sv.columnProvider.getColumn(focused.cell.x, colType);
    const rowType = this.storesYToType[focused.position.x];
    const model = this.sv.dataProvider.getModel(focused.cell.x, rowType);
    return {
      column,
      model,
      cell: focused.cell,
      colType,
      rowType
    };
  }

  setEdit(rowIndex: number, colIndex: number, colType: RevoGrid.DimensionCols, rowType: RevoGrid.DimensionRows) {
    const stores = this.storesByType;
    const storeCoordinate = {
      x: stores[colType],
      y: stores[rowType],
    };
    this.sv.selectionStoreConnector?.setEditByCell(storeCoordinate, { x: colIndex, y: rowIndex });
  }
}
