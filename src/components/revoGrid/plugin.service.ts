import { PluginBaseComponent, PluginProviders, PluginServiceBase } from '@type';
import { GridPlugin } from 'src/plugins';

/**
 * Plugin service
 * Manages plugins
 */
export class PluginService implements PluginServiceBase {
  /**
   * Plugins
   * Define plugins collection
   */
  internalPlugins: PluginBaseComponent[] = [];

  /**
   * Get all plugins
   */
  get() {
    return [...this.internalPlugins];
  }

  /**
   * Add plugin to collection
   */
  add(plugin: PluginBaseComponent) {
    this.internalPlugins.push(plugin);
  }

  /**
   * Add user plugins and create
   */
  addUserPluginsAndCreate(
    element: HTMLRevoGridElement,
    plugins: GridPlugin[] = [],
    prevPlugins?: GridPlugin[],
    pluginData?: PluginProviders,
  ) {
    if (!pluginData) {
      return;
    }

    // Step 1: Identify plugins to remove, compare new and old plugins
    const pluginsToRemove =
      prevPlugins?.filter(
        prevPlugin => !plugins.some(userPlugin => userPlugin === prevPlugin),
      ) || [];

    // Step 2: Remove old plugins
    pluginsToRemove.forEach(plugin => {
      const index = this.internalPlugins.findIndex(
        createdPlugin => createdPlugin instanceof plugin,
      );
      if (index !== -1) {
        this.internalPlugins[index].destroy?.();
        this.internalPlugins.splice(index, 1); // Remove the plugin
      }
    });

    // Step 3: Register user plugins
    plugins?.forEach(userPlugin => {
      // check if plugin already exists, if so, skip
      const existingPlugin = this.internalPlugins.find(
        createdPlugin => createdPlugin instanceof userPlugin,
      );
      if (existingPlugin) {
        return;
      }
      this.add(new userPlugin(element, pluginData));
    });
  }

  /**
   * Get plugin by class
   */
  getByClass<T extends PluginBaseComponent>(
    pluginClass: new (...args: any[]) => T,
  ): T | undefined {
    return this.internalPlugins.find(p => p instanceof pluginClass) as
      | T
      | undefined;
  }

  /**
   * Remove plugin
   */
  remove(plugin: PluginBaseComponent) {
    const index = this.internalPlugins.indexOf(plugin);
    if (index > -1) {
      this.internalPlugins[index].destroy?.();
      this.internalPlugins.splice(index, 1);
    }
  }

  /**
   * Remove all plugins
   */

  destroy() {
    this.internalPlugins.forEach(p => p.destroy?.());
    this.internalPlugins = [];
  }
}
