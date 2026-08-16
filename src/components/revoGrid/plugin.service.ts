import { PluginBaseComponent, PluginProviders, PluginServiceBase } from '@type';
import type { GridPlugin } from 'src/plugins';
import { isGridPlugin } from '../../plugins/plugin.utils';

type PluginSource = 'persistent' | 'synchronized';

interface PluginRegistration {
  instance: PluginBaseComponent;
  source: PluginSource;
  pluginType?: GridPlugin;
}

/**
 * Plugin service
 * Manages plugins
 */
export class PluginService implements PluginServiceBase {
  // Public add() accepts structural plugin objects, so distinct instances must
  // remain ordered here instead of being collapsed by their shared constructor.
  private registrations: PluginRegistration[] = [];

  // Only grid/theme-synchronized plugins are constructor-indexed. This enables
  // constructor deduplication and removal without affecting persistent instances.
  private synchronizedPlugins = new Map<GridPlugin, PluginRegistration>();

  /**
   * Get all plugins
   */
  get() {
    return this.registrations.map(({ instance }) => instance);
  }

  /**
   * Add plugin to collection
   */
  add(plugin: PluginBaseComponent) {
    const existing = this.registrations.find(
      registration => registration.instance === plugin,
    );
    if (existing) {
      if (existing.source === 'synchronized' && existing.pluginType) {
        this.synchronizedPlugins.delete(existing.pluginType);
        existing.source = 'persistent';
        existing.pluginType = undefined;
      }
      return;
    }
    this.registrations.push({ instance: plugin, source: 'persistent' });
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

    for (const [plugin, registration] of this.synchronizedPlugins) {
      if (!requestedPlugins.has(plugin)) {
        this.remove(registration.instance);
      }
    }

    for (const plugin of requestedPlugins) {
      const existing = this.registrations.some(
        registration => registration.instance.constructor === plugin,
      );
      if (existing) {
        continue;
      }
      const registration: PluginRegistration = {
        instance: new plugin(element, pluginData),
        source: 'synchronized',
        pluginType: plugin,
      };
      this.registrations.push(registration);
      this.synchronizedPlugins.set(plugin, registration);
    }
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
    const index = this.registrations.findIndex(
      registration => registration.instance === plugin,
    );
    if (index !== -1) {
      const [registration] = this.registrations.splice(index, 1);
      if (registration.source === 'synchronized' && registration.pluginType) {
        this.synchronizedPlugins.delete(registration.pluginType);
      }
      registration.instance.destroy?.();
    }
  }

  /**
   * Remove all plugins
   */

  destroy() {
    this.registrations.forEach(({ instance }) => instance.destroy?.());
    this.registrations = [];
    this.synchronizedPlugins.clear();
  }
}
