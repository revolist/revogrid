import {Component, Element, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';

import {rowsStore as viewportRows, colsStore as viewportCols} from '../../store/viewPort/viewport.store';
import dataProvider from '../../services/data.provider';
import {CELL_CLASS, DATA_COL, DATA_ROW, DISABLED_CLASS} from '../../utils/consts';

@Component({
  tag: 'revogr-data'
})
export class RevogrData {
  @Element() element!: HTMLStencilElement;

  render() {
    const rowsEls: HTMLElement[] = [];
    const rows = viewportRows.get('items');
    const cols = viewportCols.get('items');
    for (let row of rows) {
      const cells: HTMLElement[] = [];
      for (let col of cols) {
        const dataProps = {
          [DATA_COL]: col.itemIndex,
          [DATA_ROW]: row.itemIndex,
          class: `${CELL_CLASS} ${dataProvider.isReadOnly(row.itemIndex, col.itemIndex) ? DISABLED_CLASS : ''}`,
          style: { width: `${col.size}px`, transform: `translateX(${col.start}px)`}
        };
        cells.push(<div {...dataProps}>{dataProvider.cellRenderer(row.itemIndex, col.itemIndex)}</div>);
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return rowsEls;
  }
}
