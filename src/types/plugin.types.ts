import { PluginBaseComponent } from '@type';
import ColumnDataProvider from '../services/column.data.provider';
import { DataProvider } from '../services/data.provider';
import DimensionProvider from '../services/dimension.provider';
import type { SelectionStoreConnector } from '../services/selection.store.connector';
import ViewportProvider from '../services/viewport.provider';

export interface PluginServiceBase {
  get(): PluginBaseComponent[];
  add(plugin: PluginBaseComponent): void;
  remove(plugin: PluginBaseComponent): void;
  getByClass<T extends PluginBaseComponent>(
    pluginClass: new (...args: any[]) => T,
  ): T | undefined;
}

/**
 * Services that are provided by the various plugins for use by the grid. Each plugin
 * is responsible for providing a specific service, and the `PluginProviders` type collects all the services provided
 * by the plugins.
 */
export type PluginProviders = {
  /**
   * The data service provides access to the grid data.
   */
  data: DataProvider;
  /**
   * The dimension service provides access to the grid's dimensions and settings.
   */
  dimension: DimensionProvider;
  /**
   * The selection service provides access to the grid's selection state.
   */
  selection: SelectionStoreConnector;
  /**
   * The column service provides access to the grid's column data.
   */
  column: ColumnDataProvider;
  /**
   * The viewport service provides access to the grid's viewport state.
   */
  viewport: ViewportProvider;

  /**
   * Plugin services
   */

  plugins: PluginServiceBase;
};

declare global {
  type CombinedHTMLRevoGridElementEventMap = Record<string, any> &
    HTMLRevogrClipboardElementEventMap &
    HTMLRevogrFocusElementEventMap &
    HTMLRevogrDataElementEventMap &
    HTMLRevogrEditElementEventMap &
    HTMLRevogrFilterPanelElementEventMap &
    HTMLRevogrHeaderElementEventMap &
    HTMLRevogrOrderEditorElementEventMap &
    HTMLRevogrOverlaySelectionElementEventMap &
    HTMLRevogrRowHeadersElementEventMap &
    HTMLRevogrScrollVirtualElementEventMap &
    HTMLRevogrViewportScrollElementEventMap &
    HTMLVnodeHtmlElementEventMap;
    
  interface HTMLRevoGridElementEventMap extends CombinedHTMLRevoGridElementEventMap {
    //
  }
}
