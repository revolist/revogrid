import { h } from '@stencil/core';
import { createStore } from '@stencil/store';
import { columnTypes, rowTypes } from '@store';
import type { DimensionCols, DimensionRows } from '@type';

type OwnedHeaders = Record<string, string>;
type HeaderRoot = Document | DocumentFragment;
type Pane = DimensionCols | 'rowHeaders';
type RowGroupKey = `${Pane}-${DimensionRows}`;

const rowGroupOrder = (['rowHeaders', ...columnTypes] as const).flatMap(pane =>
  rowTypes.map(row => `${pane}-${row}` as const),
);

function getIdRoot(element: Element): HeaderRoot {
  const root = element.getRootNode();
  return root instanceof DocumentFragment ? root : element.ownerDocument;
}

const nextId = { header: 0, rowgroup: 0 };
function ensureId(
  element: Element,
  root: HeaderRoot,
  prefix: 'header' | 'rowgroup',
): string {
  let id = element.id;
  if (
    !id ||
    /\s/.test(id) ||
    root.querySelectorAll(`#${CSS.escape(id)}`).length > 1
  ) {
    do {
      id = `revo-a11y-${prefix}-${++nextId[prefix]}`;
    } while (root.getElementById(id));
    element.id = id;
  }
  return id;
}

/** Associate the treegrid with mounted headers and rowgroups in the visual panes. */
export class TreegridOwnership {
  private readonly panes = createStore<
    Partial<Record<DimensionCols, OwnedHeaders>>
  >({});

  private readonly rowGroups = createStore<
    Partial<Record<RowGroupKey, string>>
  >({});

  get rowGroupIds() {
    return (
      rowGroupOrder
        .map(key => this.rowGroups.state[key])
        .filter(Boolean)
        .join(' ') || undefined
    );
  }

  rowGroupProps(pane: Pane, row: DimensionRows, hasRows: boolean) {
    const key: RowGroupKey = `${pane}-${row}`;
    return {
      role: hasRows ? 'rowgroup' : undefined,
      ref: (element?: HTMLRevogrDataElement) => {
        this.rowGroups.state[key] =
          element && hasRows
            ? ensureId(element, getIdRoot(element), 'rowgroup')
            : undefined;
      },
    };
  }

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
    const idRoot = getIdRoot(header);
    const fragments = header.querySelectorAll<HTMLElement>(
      ':scope > [data-rg-header-row], :scope > .group-rgRow > [data-rg-header-row]',
    );
    fragments.forEach(fragment => {
      // Own the rendered cells without interpreting or rewriting custom roles.
      const ids = Array.from(
        fragment.querySelectorAll(':scope > [data-rg-header-cell]'),
        cell => ensureId(cell, idRoot, 'header'),
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
    this.rowGroups.dispose();
  }
}
