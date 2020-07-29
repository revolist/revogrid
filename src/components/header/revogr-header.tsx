import {Component, Element, h, Prop} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';

import {colsStore as viewportCols} from '../../store/viewport.store';
import dataProvider from '../../services/data.provider';
import {DATA_COL, HEADER_CLASS} from '../../utils/consts';
import moduleRegister from '../../services/moduleRegister';
import HeaderResizeService from './headerResizeService';

@Component({
  tag: 'revogr-header'
})
export class RevogrHeaderComponent {
  @Element() element!: HTMLStencilElement;
  @Prop() resize: boolean;

  connectedCallback(): void {
    if (this.resize) {
      moduleRegister.register('headResize', new HeaderResizeService(`${moduleRegister.baseClass} .${HEADER_CLASS}`));
    }
  }

  disconnectedCallback(): void {
    moduleRegister.unregister('headResize');
  }

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
