import { each } from 'lodash';
import { RevoGrid, RevoPlugin } from '../interfaces';
import { ColumnCollection } from '../services/column.data.provider';
import DimensionProvider, { ColumnItems } from '../services/dimension.provider';
import BasePlugin from './basePlugin';

/**
 * This plugin serves to recalculate columns initially
 * Base on empty space if there is any
 * Currently plugin supports only increasing last column
 */

export default class StretchColumn extends BasePlugin {
  constructor(
    revogrid: HTMLRevoGridElement,
    private dimensionProvider: DimensionProvider
  ) {
    super(revogrid);
    const beforecolumnapplied = ({ detail: { columns } }: CustomEvent<ColumnCollection>) => this.applyStretch(columns);
    this.addEventListener('beforecolumnapplied', beforecolumnapplied);
  }

  applyStretch(columns: ColumnItems) {
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
        const type: RevoGrid.DimensionCols = 'rgCol';
        this.dimensionProvider.setDimensionSize(type, { [index]: sizeDifference + this.revogrid.colSize });
      }
    }
  }
}

export function isStretchPlugin(plugin: RevoPlugin.Plugin|StretchColumn): plugin is StretchColumn {
  return !!(plugin as StretchColumn).applyStretch;
}
