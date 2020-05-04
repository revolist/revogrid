import {Component, Element, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';

import {rowsStore as viewportRows, colsStore as viewportCols} from '../../store/viewport.store';
import dataStore from '../../store/data.store';

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
        cells.push(
          <div
            class='data-cell'
            style={{ width: `${col.size}px`, transform: `translateX(${col.start}px)`}}>
            {dataStore.provider.data(row.itemIndex, col.itemIndex)}
          </div>
        );
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    return rowsEls;
  }
}
