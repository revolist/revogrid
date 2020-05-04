import interact from 'interactjs';
import {Component, Element, h} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';


import {colsStore as viewportCols} from '../../store/viewport.store';
import dataStore from '../../store/data.store';
import {setDimensionSize} from '../../store/dimension.store';

@Component({
  tag: 'revogr-header'
})
export class ViewportDataComponent {
  @Element() element!: HTMLStencilElement;

  componentWillLoad(): void {
    interact('.data-header-cell').resizable({
      edges: { bottom: false, right: true },
      onend: event => {
        const index: number = parseInt(event.target.getAttribute('data-col'), 10);
        setDimensionSize({ [index]: event.rect.width }, 'col');
        event.target.style.width = `${event.rect.width}px`;
      }
    });
  }

  render() {
    const cells:HTMLElement[] = [];
    for (let col of viewportCols.get('items')) {
      cells.push(
        <div class={'data-header-cell'}
             data-col={col.itemIndex}
             style={{ width:  `${col.size}px`, transform: `translateX(${col.start}px)` }}>
          {dataStore.provider.header(col.itemIndex)}
        </div>
      );
    }
    return cells;
  }
}
