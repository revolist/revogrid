import { h } from '@stencil/core';
import { createStore } from '@stencil/store';
import { columnTypes } from '@store';
import type { DimensionCols } from '@type';

type OwnedHeaders = Record<string, string>;
type HeaderRoot = Document | DocumentFragment;

let nextHeaderId = 0;
const generatedIds = new WeakMap<Element, string>();

function getHeaderId(cell: Element, root: HeaderRoot): string {
  let id = cell.id;
  if (id && generatedIds.get(cell) !== id) {
    return id;
  }
  // Applications can introduce a collision between header renders.
  if (!id || root.querySelectorAll(`#${id}`).length > 1) {
    do {
      id = `revo-a11y-header-${++nextHeaderId}`;
    } while (root.getElementById(id));
    cell.id = id;
    generatedIds.set(cell, id);
  }
  return id;
}

/** Associate mounted header cells with logical rows across the visual panes. */
export class HeaderRowOwnership {
  private readonly panes = createStore<
    Partial<Record<DimensionCols, OwnedHeaders>>
  >({});

  paneProps(type: DimensionCols) {
    return {
      onAfterheaderrender: (event: Event) => {
        const header = event.currentTarget;
        if (header instanceof HTMLElement && event.target === header) {
          this.update(type, header);
        }
      },
      ref: (header?: HTMLRevogrHeaderElement) => {
        if (!header) {
          this.panes.state[type] = undefined;
        }
      },
    };
  }

  readonly nodes = [() => this.render()];

  private update(type: DimensionCols, header: HTMLElement) {
    const rows: OwnedHeaders = {};
    const root = header.getRootNode();
    const idRoot =
      root instanceof DocumentFragment ? root : header.ownerDocument;
    const fragments = header.querySelectorAll<HTMLElement>(
      ':scope > [data-rg-header-row], :scope > .group-rgRow > [data-rg-header-row]',
    );
    fragments.forEach(fragment => {
      // Own the rendered cells without interpreting or rewriting custom roles.
      const ids = Array.from(
        fragment.querySelectorAll(':scope > [data-rg-header-cell]'),
        cell => getHeaderId(cell, idRoot),
      );
      const index = fragment.dataset.rgHeaderRow;
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

  private render() {
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
  }

  destroy() {
    this.panes.dispose();
  }
}
