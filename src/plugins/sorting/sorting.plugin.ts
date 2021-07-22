import size from 'lodash/size';

import { RevoGrid } from '../../interfaces';
import { setStore } from '../../utils/store.utils';
import ColumnDataProvider from '../../services/column.data.provider';
import BasePlugin from '../basePlugin';

import DimensionRows = RevoGrid.DimensionRows;

export type SortingOrder = Record<RevoGrid.ColumnProp, RevoGrid.Order>;
type SortingOrderFunction = Record<RevoGrid.ColumnProp, RevoGrid.CellCompareFunc>;
type SourceSetEvent = {
  type: DimensionRows;
  source: RevoGrid.DataType[];
};
type ColumnSetEvent = {
  order: SortingOrder;
};

/**
 * lifecycle
 * 1) @event beforesorting - sorting just started, nothing happened yet
 * 2) @metod updateColumnSorting - column sorting icon applied to grid and column get updated, data still untiuched
 * 3) @event beforesortingapply - before we applied sorting data to data source, you can prevent data apply from here
 * 4) @event afterSortingApply - sorting applied, just finished event
 *
 * If you prevent event it'll not reach farther steps
 */

export default class SortingPlugin extends BasePlugin {
  private sorting: SortingOrder | null = null;
  private sortingFunc: SortingOrderFunction | null = null;

  get hasSorting() {
    return !!this.sorting;
  }

  constructor(protected revogrid: HTMLRevoGridElement) {
    super(revogrid);

    const beforesourceset = ({ detail }: CustomEvent<SourceSetEvent>) => {
      if (this.hasSorting) {
        // is sorting allowed
        const event = this.emit('beforesourcesortingapply');
        // sorting prevented
        if (event.defaultPrevented) {
          return;
        }
      }
      const data = this.setData(detail.source, detail.type);
      if (data) {
        detail.source = data;
      }
    };
    const aftercolumnsset = async ({ detail: { order } }: CustomEvent<ColumnSetEvent>) => {

      const columns = await this.revogrid.getColumns();
      const sortingFunc : SortingOrderFunction = {};

      for (let prop in order) {
        const column = ColumnDataProvider.getColumnByProp(columns, prop);
        const cmp : RevoGrid.CellCompareFunc = column?.cellCompare || this.defaultCellCompare;
      
        sortingFunc[prop] = order[prop] == 'desc' ? this.descCellCompare(cmp) : cmp;
      }
      this.sort(order,sortingFunc);
    }
    const headerclick = async (e: CustomEvent<RevoGrid.InitialHeaderClick>) => {
      if (e.defaultPrevented) {
        return;
      }

      if (!e.detail.column.sortable) {
        return;
      }

      this.headerclick(e.detail.column, e.detail.index);
    };

    this.addEventListener('beforesourceset', beforesourceset);
    this.addEventListener('aftercolumnsset', aftercolumnsset);
    this.addEventListener('initialHeaderClick', headerclick);
  }

  private async headerclick(column: RevoGrid.ColumnRegular, index: number) {
    let order: RevoGrid.Order = this.getNextOrder(column.order);
    const beforeEvent = this.emit('beforesorting', { column, order });
    if (beforeEvent.defaultPrevented) {
      return;
    }
    order = beforeEvent.detail.order;
    const newCol = await this.revogrid.updateColumnSorting(beforeEvent.detail.column, index, order);

    // apply sort data
    const beforeApplyEvent = this.emit('beforesortingapply', { column: newCol, order });
    if (beforeApplyEvent.defaultPrevented) {
      return;
    }
    order = beforeApplyEvent.detail.order;

    const cmp : RevoGrid.CellCompareFunc = column?.cellCompare || this.defaultCellCompare;

    this.sort(
      { [column.prop]: order },
      { [column.prop]: order == 'desc' ? this.descCellCompare(cmp) : cmp }
    );
  }

  private setData(data: RevoGrid.DataType[], type: DimensionRows): RevoGrid.DataType[] | void {
    // sorting available for rgRow type only
    if (type === 'rgRow' && this.sortingFunc) {
      return this.sortItems(data, this.sortingFunc);
    }
  }

  /**
   * Sorting apply, available for rgRow type only
   * @param sorting - per column sorting
   * @param data - this.stores['rgRow'].store.get('source')
   */
  private async sort(sorting: SortingOrder, sortingFunc: SortingOrderFunction) {
    if (!size(sorting)) {
      this.sorting = null;
      this.sortingFunc = null;
      return;
    }
    this.sorting = sorting;
    this.sortingFunc = sortingFunc;

    const store = await this.revogrid.getSourceStore();

    const source = store.get('source');
    const proxyItems = this.sortIndexByItems([...store.get('proxyItems')], source, this.sortingFunc);
    setStore(store, {
      proxyItems,
      source: [...source],
    });
    this.emit('afterSortingApply');
  }

  private defaultCellCompare(prop: RevoGrid.ColumnProp, a: RevoGrid.DataType, b: RevoGrid.DataType){
    const av = a[prop];
    const bv = b[prop];
    
    return av?.toString().toLowerCase() > bv?.toString().toLowerCase() ? 1 : -1;
  }

  private descCellCompare(cmp: RevoGrid.CellCompareFunc) {
    return (prop: RevoGrid.ColumnProp, a: RevoGrid.DataType, b: RevoGrid.DataType) : number => { return -1 * cmp(prop,a,b) }
  }

  private sortIndexByItems(indexes: number[], source: RevoGrid.DataType[], sortingFunc: SortingOrderFunction): number[] {
    // TODO - is there a situation where multiple kvps in the `sorting` object would cause this to break?
    for (let prop in sortingFunc) {
      if (typeof sortingFunc[prop] === 'undefined') {
        // Unsort indexes
        return [...Array(indexes.length).keys()];
      }
    }
    return indexes.sort((a, b) => {
      let sorted = 0;
      for (let prop in sortingFunc) {
        const cmp = sortingFunc[prop];
        const itemA = source[a];
        const itemB = source[b];
        sorted = cmp(prop, itemA, itemB);
        if (sorted) {
           break;
        }
      }
      return sorted;
    });
  }

  private sortItems(source: RevoGrid.DataType[], sortingFunc: SortingOrderFunction): RevoGrid.DataType[] {
    let order: RevoGrid.Order

    return source.sort((a, b) => {
      let sorted = 0;
      for (let prop in sortingFunc) {
        const cmp = sortingFunc[prop];
        sorted = cmp(prop, a, b);
        if (sorted) {
           break;
        }
      }
      return sorted;
    });
  }

  private getNextOrder(currentOrder: RevoGrid.Order): RevoGrid.Order {
    switch (currentOrder) {
      case undefined:
        return 'asc';
      case 'asc':
        return 'desc';
      case 'desc':
        return undefined;
    }
  }
}
