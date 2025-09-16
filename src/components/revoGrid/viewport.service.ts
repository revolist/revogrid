import DimensionProvider from '../../services/dimension.provider';
import { type SelectionStoreConnector } from '../../services/selection.store.connector';
import ViewportProvider from '../../services/viewport.provider';
import { columnTypes, DSourceState, getSourceItem, getVisibleSourceItem, rowTypes } from '@store';
import { OrdererService } from '../order/order-renderer';
import GridScrollingService from './viewport.scrolling.service';
import { CONTENT_SLOT, FOOTER_SLOT, HEADER_SLOT, viewportDataPartition, VPPartition } from './viewport.helpers';

import ColumnDataProvider from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import type {
  AllDimensionType,
  Cell,
  ColumnRegular,
  DimensionCols,
  DimensionRows,
  HeaderProperties,
  RangeArea,
  SlotType,
  ViewportColumn,
  ViewportData,
  ViewportProperties,
  ViewportProps,
  ViewPortResizeEvent,
  ViewportState,
  ViewSettingSizeProp,
} from '@type';
import { Observable } from '../../utils';

export type ResizeDetails = { [index: number]: ColumnRegular };
type Config = {
  columnProvider: ColumnDataProvider;
  dataProvider: DataProvider;
  dimensionProvider: DimensionProvider;
  viewportProvider: ViewportProvider;
  scrollingService: GridScrollingService;
  orderService: OrdererService;
  selectionStoreConnector: SelectionStoreConnector;

  disableVirtualX?: boolean;
  disableVirtualY?: boolean;

  resize(r: ResizeDetails): void;
};

export type FocusedData = {
  model: any;
  cell: Cell;
  colType: DimensionCols;
  rowType: DimensionRows;
  column?: ColumnRegular;
};

/** Collect Column data */
function gatherColumnData(data: ViewportColumn) {
  const colDimension = data.dimensions[data.colType].store;
  const realWidth = colDimension.get('realSize');

  const prop: ViewportProperties = {
    contentWidth: realWidth,
    class: data.colType,
    contentHeight: data.contentHeight,
    key: data.colType,
    colType: data.colType,
    onResizeviewport: data.onResizeviewport,
    // set viewport size to real size
    style: data.fixWidth ? { minWidth: `${realWidth}px` } : undefined,
  };

  const headerProp: HeaderProperties = {
    colData: getVisibleSourceItem(data.colStore),
    dimensionCol: colDimension,
    type: data.colType,
    groups: data.colStore.get('groups'),
    groupingDepth: data.colStore.get('groupingDepth'),
    resizeHandler: data.colType === 'colPinEnd' ? ['l'] : undefined,
    onHeaderresize: data.onHeaderresize,
  };

  return {
    prop,
    type: data.colType,
    position: data.position,
    headerProp,
    viewportCol: data.viewports[data.colType].store,
  };
}

export default class ViewportService {
  readonly columns: ViewportProps[];
  constructor(
    private config: Config,
    contentHeight: number,
  ) {
    // ----------- Handle columns ----------- //

    // Transform data from stores and apply it to different components
    const columns: ViewportProps[] = [];
    let x = 0; // we increase x only if column present
    columnTypes.forEach(val => {
      const colStore = config.columnProvider.stores[val].store;
      // only columns that have data show
      if (!colStore.get('items').length) {
        return;
      }
      const column: ViewportColumn = {
        colType: val,
        position: { x, y: 1 },

        contentHeight,
        // only central column has dynamic width
        fixWidth: val !== 'rgCol',

        viewports: config.viewportProvider.stores,
        dimensions: config.dimensionProvider.stores,
        rowStores: config.dataProvider.stores,

        colStore,
        onHeaderresize: e => this.onColumnResize(val, e, colStore),
      };
      if (val === 'rgCol') {
        column.onResizeviewport = (e: CustomEvent<ViewPortResizeEvent>) => {
          const vpState: Partial<ViewportState> = {
            clientSize: e.detail.size,
          };

          // virtual size will be handled by dimension provider if disabled
          if ((e.detail.dimension === 'rgRow' && !config.disableVirtualY)
              || (e.detail.dimension === 'rgCol' && !config.disableVirtualX)) {
                vpState.virtualSize = e.detail.size;
          }
          config.viewportProvider?.setViewport(e.detail.dimension, vpState);
        };
      }
      const colData = gatherColumnData(column);
      const columnSelectionStore = this.registerCol(colData.position.x, val);

      // render per each column data collections vertically
      const dataPorts = this.dataViewPort(column).reduce<ViewportData[]>(
        (r, rgRow) => {
          // register selection store for Segment
          const segmentSelection = this.registerSegment(rgRow.position, rgRow.lastCell);

          // register selection store for Row
          const rowSelectionStore = this.registerRow(
            rgRow.position.y,
            rgRow.type,
          );
          const rowDef: ViewportData = {
            colType: val,
            ...rgRow,
            rowSelectionStore,
            selectionStore: segmentSelection.store,
            onSetrange: e => {
              segmentSelection.setRangeArea(e.detail);
            },
            onSettemprange: e => segmentSelection.setTempArea(e.detail),
            onFocuscell: e => {
              // todo: multi focus
              segmentSelection.clearFocus();
              config.selectionStoreConnector.focus(segmentSelection, e.detail);
            },
          };
          r.push(rowDef);
          return r;
        },
        [],
      );
      columns.push({
        ...colData,
        columnSelectionStore,
        dataPorts,
      });
      x++;
    });
    this.columns = columns;
    // ----------- Handle columns end ----------- //

    this.config.scrollingService?.unregister();
  }

  private onColumnResize(
    type: DimensionCols,
    { detail }: CustomEvent<ViewSettingSizeProp>,
    store: Observable<DSourceState<ColumnRegular, DimensionCols>>,
  ) {
    // apply to dimension provider
    this.config.dimensionProvider?.setCustomSizes(type, detail, true);

    // set resize event
    const changedItems: ResizeDetails = {};
    for (const [i, size] of Object.entries(detail || {})) {
      const virtualIndex = parseInt(i, 10);
      const item = getSourceItem(store, virtualIndex);
      if (item) {
        changedItems[virtualIndex] = { ...item, size };
      }
    }
    this.config.resize(changedItems);
  }

  /** register selection store for Segment */
  private registerSegment(position: Cell, lastCell: Cell) {
    const store = this.config.selectionStoreConnector.register(position);
    store.setLastCell(lastCell);
    return store;
  }

  /** register selection store for Row */
  private registerRow(y: number, type: DimensionRows) {
    return this.config.selectionStoreConnector.registerRow(y, type).store;
  }

  /** register selection store for Column */
  private registerCol(x: number, type: DimensionCols) {
    return this.config.selectionStoreConnector.registerColumn(x, type).store;
  }

  /** Collect Row data */
  private dataViewPort(data: ViewportColumn) {
    const slots: { [key in DimensionRows]: SlotType } = {
      rowPinStart: HEADER_SLOT,
      rgRow: CONTENT_SLOT,
      rowPinEnd: FOOTER_SLOT,
    };

    // y position for selection
    let y = 0;
    return rowTypes.reduce((result: VPPartition[], type) => {
      const rgCol = {
        ...data,
        position: { ...data.position, y },
      };
      const partition = viewportDataPartition(
        rgCol,
        type,
        slots[type],
        type !== 'rgRow', // is fixed row
      );
      result.push(partition);
      y++;
      return result;
    }, []);
  }

  scrollToCell(cell: Partial<Cell>) {
    for (let key in cell) {
      const coordinate = cell[key as keyof Cell];
      if (typeof coordinate === 'number') {
        this.config.scrollingService.proxyScroll({
          dimension: key === 'x' ? 'rgCol' : 'rgRow',
          coordinate,
        });
      }
    }
  }

  /**
   * Clear current grid focus
   */
  clearFocused() {
    this.config.selectionStoreConnector.clearAll();
  }

  clearEdit() {
    this.config.selectionStoreConnector.setEdit(false);
  }

  /**
   * Collect focused element data
   */
  getFocused(): FocusedData | null {
    const focused = this.config.selectionStoreConnector.focusedStore;
    if (!focused) {
      return null;
    }
    // get column data
    const colType =
      this.config.selectionStoreConnector.storesXToType[focused.position.x];
    const column = this.config.columnProvider.getColumn(
      focused.cell.x,
      colType,
    );

    // get row data
    const rowType =
      this.config.selectionStoreConnector.storesYToType[focused.position.y];
    const model = this.config.dataProvider.getModel(focused.cell.y, rowType);
    return {
      column,
      model,
      cell: focused.cell,
      colType,
      rowType,
    };
  }

  getStoreCoordinateByType(colType: DimensionCols, rowType: DimensionRows): Cell | undefined {
    const stores = this.config.selectionStoreConnector.storesByType;
    if (typeof stores[colType] === 'undefined' || typeof stores[rowType] === 'undefined') {
      return;
    }
    return {
      x: stores[colType],
      y: stores[rowType],
    };
  }

  setFocus(colType: string, rowType: string, start: Cell, end: Cell) {
    const coordinate = this.getStoreCoordinateByType(colType as DimensionCols, rowType as DimensionRows);
    if (coordinate) {
      this.config.selectionStoreConnector?.focusByCell(
        coordinate,
        start,
        end,
      );
    }
  }

  getSelectedRange(): RangeArea & AllDimensionType | null | undefined {

    const focused = this.config.selectionStoreConnector.focusedStore;
    if (!focused) {
      return null;
    }
    // get column data
    const colType =
      this.config.selectionStoreConnector.storesXToType[focused.position.x];

    // get row data
    const rowType =
      this.config.selectionStoreConnector.storesYToType[focused.position.y];

    const range = focused.entity.store.get('range');
    if (!range) {
      return null;
    }
    return {
      ...range,
      colType,
      rowType,
    }
  }

  setEdit(
    rowIndex: number,
    colIndex: number,
    colType: DimensionCols,
    rowType: DimensionRows,
  ) {
    const coordinate = this.getStoreCoordinateByType(colType as DimensionCols, rowType as DimensionRows);
    if (coordinate) {
      this.config.selectionStoreConnector?.setEditByCell(
        coordinate,
        { x: colIndex, y: rowIndex },
      );
    }
  }
}
