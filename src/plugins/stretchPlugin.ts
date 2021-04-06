import { each } from 'lodash';
import { RevoGrid, RevoPlugin } from '../interfaces';
import { ColumnCollection } from '../services/column.data.provider';
import DimensionProvider, { ColumnItems } from '../services/dimension.provider';
import { getScrollbarWidth } from '../utils/utils';
import BasePlugin from './basePlugin';

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
  private stretchedColumn: StretchedData|null = null;
  private readonly scrollSize;
  constructor(
    revogrid: HTMLRevoGridElement,
    private dimensionProvider: DimensionProvider
  ) {
    super(revogrid);
    this.scrollSize = getScrollbarWidth(document);
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
    this.dimensionProvider.setDimensionSize(type, { [this.stretchedColumn.index]: this.stretchedColumn.size });
  }

  applyStretch(columns: ColumnItems) {
    this.dropChanges();
    let sizeDifference = this.revogrid.clientWidth - 1;
    each(columns, (_c, type: RevoGrid.DimensionCols) => {
      const realSize = this.dimensionProvider.stores[type].store.get('realSize');
      sizeDifference -= realSize;
    });
    if (sizeDifference > 0) {
      const index = columns.rgCol.length - 1;
      const last = columns.rgCol[index];
      // has column
      // no auto size applied
      // size for column shouldn't be defined
      if (last && !last.autoSize && !last.size) {
        const size = sizeDifference + this.revogrid.colSize;
        this.stretchedColumn = {
          initialSize: size,
          index,
          size
        };
        this.apply();
        this.activateChanges();
      }
    }
  }
}

export function isStretchPlugin(plugin: RevoPlugin.Plugin|StretchColumn): plugin is StretchColumn {
  return !!(plugin as StretchColumn).applyStretch;
}
