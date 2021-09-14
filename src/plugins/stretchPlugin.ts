import { each } from 'lodash';
import { calculateRowHeaderSize } from '../components/rowHeaders/row-header-utils';
import { RevoGrid, RevoPlugin } from '../interfaces';
import ColumnDataProvider, { ColumnCollection } from '../services/column.data.provider';
import { DataProvider } from '../services/data.provider';
import DimensionProvider, { ColumnItems } from '../services/dimension.provider';
import { getScrollbarWidth } from '../utils';
import BasePlugin from './basePlugin';
type Providers = {
  dataProvider: DataProvider;
  dimensionProvider: DimensionProvider;
  columnProvider: ColumnDataProvider;
};
/**
 * This plugin serves to recalculate columns initially
 * Base on empty space if there is any
 * Currently plugin supports only increasing last column
 */
type ScrollChange = {
  type: RevoGrid.DimensionType;
  hasScroll: boolean;
};
type StretchedData = {
  initialSize: number;
  size: number;
  index: number;
};

export default class StretchColumn extends BasePlugin {
  private stretchedColumn: StretchedData | null = null;
  private readonly scrollSize;
  constructor(revogrid: HTMLRevoGridElement, protected providers: Providers) {
    super(revogrid);

    // calculate scroll bar size for current user session
    this.scrollSize = getScrollbarWidth(document);

    // subscribe to column changes
    const beforecolumnapplied = ({ detail: { columns } }: CustomEvent<ColumnCollection>) => this.applyStretch(columns);
    this.addEventListener('beforecolumnapplied', beforecolumnapplied);
  }

  private setScroll({ type, hasScroll }: ScrollChange) {
    if (type === 'rgRow' && this.stretchedColumn && this.stretchedColumn?.initialSize === this.stretchedColumn.size) {
      if (hasScroll) {
        this.stretchedColumn.size -= this.scrollSize;
        this.apply();
        this.dropChanges();
      }
    }
  }

  private activateChanges() {
    const setScroll = ({ detail }: CustomEvent<ScrollChange>) => this.setScroll(detail);
    this.addEventListener('scrollchange', setScroll);
  }

  private dropChanges() {
    this.stretchedColumn = null;
    this.removeEventListener('scrollchange');
  }

  private apply() {
    if (!this.stretchedColumn) {
      return;
    }
    const type: RevoGrid.DimensionCols = 'rgCol';
    this.providers.dimensionProvider.setDimensionSize(type, { [this.stretchedColumn.index]: this.stretchedColumn.size });
  }

  /**
   * Apply stretch changes
   */
  applyStretch(columns: ColumnItems) {
    // unsubscribe from all events
    this.dropChanges();
    // calculate grid size
    let sizeDifference = this.revogrid.clientWidth - 1;
    each(columns, (_, type: RevoGrid.DimensionCols) => {
      const realSize = this.providers.dimensionProvider.stores[type].store.get('realSize');
      sizeDifference -= realSize;
    });
    if (this.revogrid.rowHeaders) {
      const itemsLength = this.providers.dataProvider.stores.rgRow.store.get('source').length;
      const header = this.revogrid.rowHeaders;
      const rowHeaderSize = calculateRowHeaderSize(itemsLength, typeof header === 'object' ? header : undefined);
      if (rowHeaderSize) {
        sizeDifference -= rowHeaderSize;
      }
    }
    if (sizeDifference > 0) {
      // currently plugin accepts last column only
      const index = columns.rgCol.length - 1;
      const last = columns.rgCol[index];
      /**
       * has column
       * no auto size applied
       * size for column shouldn't be defined
       */
      const colSize = last?.size || this.revogrid.colSize || 0;
      const size = sizeDifference + colSize - 1;

      if (last && !last.autoSize && colSize < size) {
        this.stretchedColumn = {
          initialSize: size,
          index,
          size,
        };
        this.apply();
        this.activateChanges();
      }
    }
  }
}

/**
 * Check plugin type is Stretch
 */
export function isStretchPlugin(plugin: RevoPlugin.Plugin | StretchColumn): plugin is StretchColumn {
  return !!(plugin as StretchColumn).applyStretch;
}
