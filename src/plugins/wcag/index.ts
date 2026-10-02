import type { CellProps, DimensionRows, PluginProviders } from '@type';
import { BasePlugin } from '../base.plugin';
import { ColumnCollection } from 'src/utils';

const toAriaIndex = (index: number) => `${index + 1}`;

/**
 * WCAG Plugin is responsible for enhancing the accessibility features of the RevoGrid component.
 * It ensures that the grid is fully compliant with Web Content Accessibility Guidelines (WCAG) 2.1.
 * This plugin should be the last plugin you add, as it modifies the grid's default behavior.
 *
 * The WCAG Plugin performs the following tasks:
 * - Sets the 'dir' attribute to 'ltr' for left-to-right text direction.
 * - Sets the 'role' attribute to 'treegrid' for treelike hierarchical structure.
 * - Sets the 'aria-keyshortcuts' attribute to 'Enter' and 'Esc' for keyboard shortcuts.
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
  constructor(revogrid: HTMLRevoGridElement, providers: PluginProviders) {
    super(revogrid, providers);

    revogrid.setAttribute('role', 'treegrid');
    revogrid.setAttribute('aria-keyshortcuts', 'Enter');
    revogrid.setAttribute('aria-multiselectable', 'true');
    revogrid.setAttribute('tabindex', '0');
    this.updateRowCount();

    this.addEventListener('afteranysource', () => {
      this.updateRowCount();
    });

    /**
     * Before Columns Set Event
     */
    this.addEventListener(
      'beforecolumnsset',
      ({ detail }: CustomEvent<ColumnCollection>) => {
        const columns = [
          ...detail.columns.colPinStart,
          ...detail.columns.rgCol,
          ...detail.columns.colPinEnd,
        ];

        revogrid.setAttribute('aria-colcount', `${columns.length}`);

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
              ['aria-rowindex']: this.getRowAriaIndex(
                args[0].type,
                args[0].rowIndex,
              ),
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
      ({
        detail,
      }: CustomEvent<HTMLRevogrDataElementEventMap['beforerowrender']>) => {
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
      async (
        e: CustomEvent<HTMLRevogrFocusElementEventMap['afterfocus']>,
      ) => {
        if (e.defaultPrevented) {
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

  private getRowAriaIndex(type: DimensionRows, index: number): string {
    const pinnedTopCount = this.providers.data.stores.rowPinStart.store.get(
      'source',
    ).length;
    if (type === 'rowPinStart') {
      return toAriaIndex(index);
    }
    if (type === 'rowPinEnd') {
      const mainCount = this.providers.data.stores.rgRow.store.get('source')
        .length;
      return toAriaIndex(pinnedTopCount + mainCount + index);
    }
    return toAriaIndex(pinnedTopCount + index);
  }

  private updateRowCount() {
    const stores = this.providers.data.stores;
    const rowCount =
      stores.rowPinStart.store.get('source').length +
      stores.rgRow.store.get('source').length +
      stores.rowPinEnd.store.get('source').length;
    this.revogrid.setAttribute('aria-rowcount', `${rowCount}`);
  }
}
