import size from 'lodash/size';

import { RevoGrid } from '../../interfaces';
import { setStore } from '../../utils/store.utils';
import BasePlugin from '../basePlugin';

import DimensionRows = RevoGrid.DimensionRows;

export type SortingOrder = Record<RevoGrid.ColumnProp, RevoGrid.Order>;
type SourceSetEvent = {
  type: DimensionRows;
  source: RevoGrid.DataType[];
};
type ColumnSetEvent = {
  order: SortingOrder;
};

/**
 * lifecycle
 * 1) @event beforeSorting - sorting just started, nothing happened yet
 * 2) @metod updateColumnSorting - column sorting icon applied to grid and column get updated, data still untiuched
 * 3) @event beforeSortingApply - before we applied sorting data to data source, you can prevent data apply from here
 * 4) @event afterSortingApply - sorting applied, just finished event
 *
 * If you prevent event it'll not reach farther steps
 */

export default class SortingPlugin extends BasePlugin {
  private sorting: SortingOrder | null = null;

  get hasSorting() {
    return !!this.sorting;
  }

  constructor(protected revogrid: HTMLRevoGridElement) {
    super(revogrid);

    const beforeSourceSet = ({ detail }: CustomEvent<SourceSetEvent>) => {
      if (this.hasSorting) {
        // is sorting allowed
        const event = this.emit('beforeSourceSortingApply');
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
    const afterColumnsSet = async ({ detail: { order } }: CustomEvent<ColumnSetEvent>) => this.sort(order);
    const headerClick = async (e: CustomEvent<RevoGrid.InitialHeaderClick>) => {
      if (e.defaultPrevented) {
        return;
      }

      if (!e.detail.column.sortable) {
        return;
      }

      this.headerClick(e.detail.column, e.detail.index);
    };

    this.addEventListener('beforeSourceSet', beforeSourceSet);
    this.addEventListener('afterColumnsSet', afterColumnsSet);
    this.addEventListener('initialHeaderClick', headerClick);
  }

  private async headerClick(column: RevoGrid.ColumnRegular, index: number) {
    let order: RevoGrid.Order = this.getNextOrder(column.order);
    const beforeEvent = this.emit('beforeSorting', { column, order });
    if (beforeEvent.defaultPrevented) {
      return;
    }
    order = beforeEvent.detail.order;
    const newCol = await this.revogrid.updateColumnSorting(beforeEvent.detail.column, index, order);

    // apply sort data
    const beforeApplyEvent = this.emit('beforeSortingApply', { column: newCol, order });
    if (beforeApplyEvent.defaultPrevented) {
      return;
    }
    order = beforeApplyEvent.detail.order;

    this.sort({ [column.prop]: order });
  }

  private setData(data: RevoGrid.DataType[], type: DimensionRows): RevoGrid.DataType[] | void {
    // sorting available for row type only
    if (type === 'row' && this.sorting) {
      return this.sortItems(data, this.sorting);
    }
  }

  /**
   * Sorting apply, available for row type only
   * @param sorting - per column sorting
   * @param data - this.stores['row'].store.get('source')
   */
  private async sort(sorting: SortingOrder) {
    if (!size(sorting)) {
      this.sorting = null;
      return;
    }
    this.sorting = sorting;

    const store = await this.revogrid.getSourceStore();

    const source = store.get('source');
    const proxyItems = this.sortIndexByItems([...store.get('proxyItems')], source, this.sorting);
    setStore(store, {
      proxyItems,
      source: [...source],
    });
    this.emit('afterSortingApply');
  }

  private keySort(a: any, b: any, dir: 'asc' | 'desc') {
    const d = dir === 'asc' ? 1 : -1;
    if (a === b) {
      return 0;
    }
    return a > b ? 1 * d : -1 * d;
  }

  private sortIndexByItems(indexes: number[], source: RevoGrid.DataType[], sorting: SortingOrder): number[] {
    // TODO - is there a situation where multiple kvps in the `sorting` object would cause this to break?
    for (let prop in sorting) {
      if (typeof sorting[prop] === 'undefined') {
        // Unsort indexes
        return [...Array(indexes.length).keys()];
      }
    }
    return indexes.sort((a, b) => {
      let sorted = 0;
      for (let prop in sorting) {
        const dir = sorting[prop];
        const itemA = source[a][prop];
        const itemB = source[b][prop];
        sorted = this.keySort(itemA, itemB, dir);
      }
      return sorted;
    });
  }

  private sortItems(source: RevoGrid.DataType[], sorting: SortingOrder): RevoGrid.DataType[] {
    return source.sort((a, b) => {
      let sorted = 0;
      for (let prop in sorting) {
        const dir = sorting[prop];
        const itemA = a[prop];
        const itemB = b[prop];
        sorted = this.keySort(itemA, itemB, dir);
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
