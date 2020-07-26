import {Component, Element, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';

import {rowsStore as viewportRows, colsStore as viewportCols} from '../../store/viewport.store';
import dataProvider from '../../services/data.provider';
import {CELL_CLASS, DATA_COL, DATA_ROW} from '../../utils/consts';

@Component({
  tag: 'revogr-data'
})
export class RevogrData {
  @Element() element!: HTMLStencilElement;

  render() {
    const rowsEls: HTMLElement[] = [];
    for (let row of viewportRows.get('items')) {
      const cells: HTMLElement[] = [];
      for (let col of viewportCols.get('items')) {
        const dataProps = {
          [DATA_COL]: col.itemIndex,
          [DATA_ROW]: row.itemIndex,
          class: CELL_CLASS,
          style: { width: `${col.size}px`, transform: `translateX(${col.start}px)`}
        };
        cells.push(<div {...dataProps}>{dataProvider.cellRenderer(row.itemIndex, col.itemIndex)}</div>);
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return rowsEls;
  }
}
