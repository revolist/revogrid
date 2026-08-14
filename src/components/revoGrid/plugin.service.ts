import { PluginBaseComponent, PluginProviders, PluginServiceBase } from '@type';
import type { GridPlugin } from 'src/plugins';
import { isGridPlugin } from '../../plugins/plugin.utils';

type PluginSource = 'persistent' | 'synchronized';

interface PluginRegistration {
  instance: PluginBaseComponent;
  source: PluginSource;
}

/**
 * Plugin service
 * Manages plugins
 */
export class PluginService implements PluginServiceBase {
  plugins = new Map<GridPlugin, PluginRegistration>();

  /**
   * Get all plugins
   */
  get() {
    return [...this.plugins.values()].map(({ instance }) => instance);
  }

  /**
   * Add plugin to collection
   */
  add(plugin: PluginBaseComponent) {
    this.register(plugin, 'persistent');
  }

  /**
   * Synchronize the combined grid and active-theme plugin constructors.
   */
  syncPlugins(
    element: HTMLRevoGridElement,
    plugins: GridPlugin[] = [],
    pluginData?: PluginProviders,
  ) {
    if (!pluginData) {
      return;
    }

    const requestedPlugins = new Set(plugins.filter(isGridPlugin));

    for (const [plugin, registration] of this.plugins) {
      if (
        registration.source === 'synchronized' &&
        !requestedPlugins.has(plugin)
      ) {
        this.remove(registration.instance);
      }
    }

    for (const plugin of requestedPlugins) {
      if (this.plugins.has(plugin)) {
        continue;
      }
      this.register(new plugin(element, pluginData), 'synchronized');
    }
  }

  private register(plugin: PluginBaseComponent, source: PluginSource) {
    const pluginType = plugin.constructor as GridPlugin;
    const existing = this.plugins.get(pluginType);
    if (existing) {
      if (existing.instance !== plugin) {
        plugin.destroy?.();
      }
      if (source === 'persistent') {
        existing.source = source;
      }
      return;
    }
    this.plugins.set(pluginType, { instance: plugin, source });
  }

  /**
   * Get plugin by class
   */
  getByClass<T extends PluginBaseComponent>(
    pluginClass: new (...args: any[]) => T,
  ): T | undefined {
    return this.get().find(p => p instanceof pluginClass) as T | undefined;
  }

  /**
   * Remove plugin
   */
  remove(plugin: PluginBaseComponent) {
    const pluginType = plugin.constructor as GridPlugin;
    const registration = this.plugins.get(pluginType);
    if (registration?.instance === plugin) {
      registration.instance.destroy?.();
      this.plugins.delete(pluginType);
    }
  }

  /**
   * Remove all plugins
   */

  destroy() {
    this.plugins.forEach(({ instance }) => instance.destroy?.());
    this.plugins.clear();
  }
}
