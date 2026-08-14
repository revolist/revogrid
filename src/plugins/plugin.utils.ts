import type { GridPlugin } from './base.plugin';

/** Runtime guard for constructor-valued plugin configuration. */
export function isGridPlugin(plugin: unknown): plugin is GridPlugin {
  return typeof plugin === 'function' && typeof plugin.prototype === 'object';
}
