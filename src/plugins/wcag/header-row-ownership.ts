import { h } from '@stencil/core';
import { createStore } from '@stencil/store';
import { columnTypes } from '@store';
import type { DimensionCols } from '@type';

type OwnedHeaders = Record<string, string>;

let nextHeaderId = 0;

/** Associate mounted header cells with logical rows across the visual panes. */
export class HeaderRowOwnership {
  private readonly panes = createStore<
    Partial<Record<DimensionCols, OwnedHeaders>>
  >({});

  update(type: DimensionCols, header: HTMLElement) {
    const rows: OwnedHeaders = {};
    const fragments = header.querySelectorAll(
      ':scope > [data-rg-header-row], :scope > .group-rgRow > [data-rg-header-row]',
    );
    fragments.forEach(fragment => {
      const ids: string[] = [];
      fragment
        .querySelectorAll(':scope > [role="columnheader"]')
        .forEach(cell => {
          cell.id ||= `revo-a11y-header-${++nextHeaderId}`;
          ids.push(cell.id);
        });
      const index = fragment.getAttribute('data-rg-header-row');
      if (index && ids.length) {
        rows[index] = ids.join(' ');
      }
    });

    const previous = this.panes.state[type];
    const indices = Object.keys(rows);
    if (
      !previous ||
      Object.keys(previous).length !== indices.length ||
      indices.some(index => previous[index] !== rows[index])
    ) {
      this.panes.state[type] = rows;
    }
  }

  clear(type: DimensionCols) {
    this.panes.state[type] = undefined;
  }

  readonly render = () => {
    const rows: OwnedHeaders = {};
    for (const type of columnTypes) {
      for (const [index, ids] of Object.entries(this.panes.state[type] ?? {})) {
        rows[index] = rows[index] ? `${rows[index]} ${ids}` : ids;
      }
    }
    // Integer keys enumerate in row-index order.
    return h(
      'div',
      null,
      Object.entries(rows).map(([index, ids]) =>
        h('div', {
          'key': index,
          'role': 'row',
          'aria-rowindex': index,
          'aria-owns': ids,
        }),
      ),
    );
  };

  destroy() {
    this.panes.dispose();
  }
}
