import type { CellProps, DimensionRows, PluginProviders } from '@type';
import { BasePlugin } from '../base.plugin';
import { ColumnCollection } from 'src/utils';
import { createStore } from '@stencil/store';
import { columnTypes } from '@store';
import {
  getHeaderRowIndices,
  type HeaderRowIndices,
} from './header-row-indices';
import { TreegridOwnership } from './treegrid-ownership';

const toAriaIndex = (index: number) => `${index + 1}`;

/**
 * WCAG Plugin is responsible for enhancing the accessibility features of the RevoGrid component.
 * It ensures that the grid is fully compliant with Web Content Accessibility Guidelines (WCAG) 2.1.
 * This plugin should be the last plugin you add, as it modifies the grid's default behavior.
 *
 * The WCAG Plugin performs the following tasks:
 * - Sets the 'dir' attribute to 'ltr' for left-to-right text direction.
 * - Provides the treegrid role, accessible name, and counts for the main viewport.
 * - Exposes the 'Enter' keyboard shortcut.
 * - Adds event listeners for keyboard navigation and editing.
 *
 * By default, the plugin adds ARIA roles and properties to the grid elements, providing semantic information
 * for assistive technologies. These roles include 'grid', 'row', and 'gridcell'. The plugin also sets
 * ARIA attributes such as 'aria-rowindex', 'aria-colindex', and 'aria-selected'.
 *
 * The WCAG Plugin ensures that the grid is fully functional and usable for users with various disabilities,
 * including visual impairments, deaf-blindness, and cognitive disabilities.
 *
 * Note: The WCAG Plugin should be added as the last plugin in the list of plugins, as it modifies the grid's
 * default behavior and may conflict with other plugins if added earlier.
 */
export class WCAGPlugin extends BasePlugin {
  private static readonly active = new WeakMap<
    HTMLRevoGridElement,
    WCAGPlugin
  >();
  readonly ownership = new TreegridOwnership();
  private readonly unsubscribe: Array<() => void> = [];
  private readonly counts = createStore({
    rowPinStart: 0,
    rgRow: 0,
    rowPinEnd: 0,
    columns: 0,
    headers: { groups: {}, leaf: 0 } as HeaderRowIndices,
  });

  get headerRowIndices() {
    return this.counts.state.headers;
  }

  get treegridAttributes() {
    const { rowPinStart, rgRow, rowPinEnd, columns } = this.counts.state;
    return {
      'role': 'treegrid',
      'aria-label': this.revogrid.getAttribute('aria-label') ?? undefined,
      'aria-labelledby':
        this.revogrid.getAttribute('aria-labelledby') ?? undefined,
      'aria-describedby':
        this.revogrid.getAttribute('aria-describedby') ?? undefined,
      'aria-description':
        this.revogrid.getAttribute('aria-description') ?? undefined,
      'aria-keyshortcuts': 'Enter',
      'aria-multiselectable': 'true',
      'aria-rowcount':
        this.headerRowIndices.leaf + rowPinStart + rgRow + rowPinEnd,
      'aria-colcount': columns,
      'aria-owns': this.ownership.rowGroupIds,
      'tabIndex': 0,
    } as const;
  }

  constructor(revogrid: HTMLRevoGridElement, providers: PluginProviders) {
    super(revogrid, providers);
    WCAGPlugin.active.set(revogrid, this);

    const columnStores = providers.column.stores;
    this.counts.state.columns =
      columnStores.colPinStart.store.get('source').length +
      columnStores.rgCol.store.get('source').length +
      columnStores.colPinEnd.store.get('source').length;

    const updateHeaderIndices = () => {
      this.counts.state.headers = getHeaderRowIndices(columnStores);
    };
    updateHeaderIndices();
    this.addEventListener('aftercolumnsset', event => {
      if (this.isOwnEvent(event)) {
        updateHeaderIndices();
      }
    });
    for (const type of columnTypes) {
      this.unsubscribe.push(
        columnStores[type].store.onChange('items', updateHeaderIndices),
      );
    }

    for (const type of ['rowPinStart', 'rgRow', 'rowPinEnd'] as const) {
      this.counts.state[type] =
        providers.data.stores[type].store.get('items').length;
      this.unsubscribe.push(
        providers.data.stores[type].store.onChange('items', items => {
          this.counts.state[type] = items.length;
        }),
      );
    }

    /**
     * Before Columns Set Event
     */
    this.addEventListener(
      'beforecolumnsset',
      (event: CustomEvent<ColumnCollection>) => {
        if (!this.isOwnEvent(event)) {
          return;
        }
        const { detail } = event;
        const columns = [
          ...detail.columns.colPinStart,
          ...detail.columns.rgCol,
          ...detail.columns.colPinEnd,
        ];

        this.counts.state.columns = columns.length;

        columns.forEach((column, index) => {
          const { columnProperties, cellProperties } = column;

          column.columnProperties = (...args) => {
            const result = columnProperties?.(...args) || {};

            result.role = 'columnheader';
            result['aria-colindex'] = toAriaIndex(index);

            return result;
          };

          column.cellProperties = (...args) => {
            const wcagProps: CellProps = {
              ['role']: 'gridcell',
              ['aria-colindex']: toAriaIndex(index),
              ['aria-rowindex']: WCAGPlugin.active
                .get(revogrid)
                ?.getRowAriaIndex(args[0].type, args[0].rowIndex),
              ['tabindex']: -1,
            };
            const columnProps: CellProps = cellProperties?.(...args) || {};

            return {
              ...wcagProps,
              ...columnProps,
            };
          };
        });
      },
    );

    /**
     * Before Row Set Event
     */
    this.addEventListener(
      'beforerowrender',
      (
        event: CustomEvent<HTMLRevogrDataElementEventMap['beforerowrender']>,
      ) => {
        if (!this.isOwnEvent(event)) {
          return;
        }
        const { detail } = event;
        detail.node.$attrs$ = {
          ...detail.node.$attrs$,
          role: 'row',
          ['aria-rowindex']: this.getRowAriaIndex(
            detail.rowType,
            detail.item.itemIndex,
          ),
        };
      },
    );

    // focuscell
    this.addEventListener(
      'afterfocus',
      async (e: CustomEvent<HTMLRevogrFocusElementEventMap['afterfocus']>) => {
        if (e.defaultPrevented || !this.isOwnEvent(e)) {
          return;
        }
        const el = this.revogrid.querySelector(
          `revogr-data[type="${e.detail.rowType}"][col-type="${e.detail.colType}"] [data-rgrow="${e.detail.rowIndex}"][data-rgcol="${e.detail.colIndex}"]`,
        );
        if (el instanceof HTMLElement) {
          el.focus();
        }
      },
    );
  }

  private isOwnEvent(event: Event): boolean {
    const origin = event
      .composedPath()
      .find(
        target =>
          target === this.revogrid ||
          (target instanceof Element && target.localName === 'revo-grid'),
      );
    return origin === this.revogrid;
  }

  private getRowAriaIndex(type: DimensionRows, index: number): string {
    const rowIndex = this.headerRowIndices.leaf + index;
    if (type === 'rowPinStart') {
      return toAriaIndex(rowIndex);
    }
    const pinnedTopCount = this.counts.state.rowPinStart;
    if (type === 'rowPinEnd') {
      const mainCount = this.counts.state.rgRow;
      return toAriaIndex(pinnedTopCount + mainCount + rowIndex);
    }
    return toAriaIndex(pinnedTopCount + rowIndex);
  }

  destroy() {
    WCAGPlugin.active.delete(this.revogrid);
    this.ownership.destroy();
    this.unsubscribe.forEach(unsubscribe => unsubscribe());
    this.unsubscribe.length = 0;
    this.counts.dispose();
    super.destroy();
  }
}
