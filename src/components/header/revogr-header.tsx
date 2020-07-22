import {Component, Element, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';


import {colsStore as viewportCols} from '../../store/viewport.store';
import dataProvider from '../../services/data.provider';
import {DATA_COL, HEADER_CLASS} from "../data/cellConsts";

@Component({
  tag: 'revogr-header'
})
export class ViewportDataComponent {
  @Element() element!: HTMLStencilElement;


  render() {
    const cells:HTMLElement[] = [];
    for (let col of viewportCols.get('items')) {
      const dataProps = {
        [DATA_COL]: col.itemIndex,
        class: HEADER_CLASS,
        style: { width:  `${col.size}px`, transform: `translateX(${col.start}px)` }
      };
      cells.push(<div {...dataProps}>{dataProvider.header(col.itemIndex)}</div>);
    }
    return cells;
  }
}
