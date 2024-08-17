import { PluginProviders } from '@type';
import { BasePlugin } from '../base.plugin';
import { ColumnCollection } from 'src/utils';

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

    revogrid.setAttribute('dir', 'ltr');
    revogrid.setAttribute('role', 'treegrid');
    revogrid.setAttribute('aria-keyshortcuts', 'Enter');
    revogrid.setAttribute('aria-keyshortcuts', 'Esc');

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
            result['aria-colindex'] = index;

            return result;
          };

          column.cellProperties = (...args) => {
            const columnProps = cellProperties?.(...args) || {};

            return {
              ...columnProps,
              role: 'gridcell',
              ['aria-colindex']: index,
              ['aria-rowindex']: args[0].rowIndex,
            };
          };
        });
      },
    );

    /**
     * Before Row Set Event
     */
    this.addEventListener(
      'beforesourceset',
      ({
        detail,
      }: CustomEvent<HTMLRevoGridElementEventMap['beforesourceset']>) => {
        revogrid.setAttribute('aria-rowcount', `${detail.source.length}`);
      },
    );
    this.addEventListener(
      'beforerowrender',
      ({
        detail,
      }: CustomEvent<HTMLRevogrDataElementEventMap['beforerowrender']>) => {
        detail.node.$attrs$ = {
          ...detail.node.$attrs$,
          role: 'row',
          ['aria-rowindex']: detail.item.itemIndex,
        };
      },
    );
  }
}
