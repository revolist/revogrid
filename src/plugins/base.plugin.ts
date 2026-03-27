import { h } from '@stencil/core';
import type { PluginProviders, PluginBaseComponent } from '../types';


export type WatchConfig = { immediate: boolean };
type WatchCleanup = () => void;

/**
 * Base layer for plugins
 * Provide minimal starting core for plugins to work
 * Extend this class to create plugin
 */
export class BasePlugin implements PluginBaseComponent {
  readonly h = h;
  readonly subscriptions: Record<string, (...args: any[]) => void> = {};
  readonly watchCleanups: WatchCleanup[] = [];
  constructor(public revogrid: HTMLRevoGridElement, public providers: PluginProviders) {}
  /**
   *
   * @param eventName - event name to subscribe to in revo-grid component (e.g. 'beforeheaderclick')
   * @param callback - callback function for event
   */
  addEventListener<K extends keyof HTMLRevoGridElementEventMap>(
    eventName: K,
    callback: (this: BasePlugin, e: CustomEvent<HTMLRevoGridElementEventMap[K]>) => void,
  ) {
    this.revogrid.addEventListener(eventName as string, callback);
    this.subscriptions[eventName as string] = callback;
  }

  /**
   * Subscribe to property change in revo-grid component
   * You can return false in callback to prevent default value set
   *
   * @param prop - property name
   * @param callback - callback function
   * @param immediate - trigger callback immediately with current value
   */
  watch<T extends any>(
    prop: string,
    callback: (arg: T) => boolean | void,
    { immediate }: Partial<WatchConfig> = { immediate: false },
  ) {
    const ownValueDesc = Object.getOwnPropertyDescriptor(this.revogrid, prop);
    const nativeValueDesc =
      ownValueDesc ||
      Object.getOwnPropertyDescriptor(this.revogrid.constructor.prototype, prop);

    // Patch the property on the element instance so plugins can observe writes
    // without mutating the component prototype for every grid on the page.
    Object.defineProperty(this.revogrid, prop, {
      configurable: true,
      enumerable: nativeValueDesc?.enumerable ?? true,
      set(val: T) {
        const keepDefault = callback(val);
        if (keepDefault === false) {
          return;
        }
        // Continue with native behavior
        return nativeValueDesc?.set?.call(this, val);
      },
      get() {
        // Continue with native behavior
        return nativeValueDesc?.get?.call(this);
      },
    });
    // Reconnect flows reuse the same element instance, so watched properties must
    // be restored on destroy or the next plugin init will fail redefining them.
    this.watchCleanups.push(() => {
      if (ownValueDesc) {
        Object.defineProperty(this.revogrid, prop, ownValueDesc);
      } else {
        delete this.revogrid[prop as keyof HTMLRevoGridElement];
      }
    });
    if (immediate) {
      callback(this.revogrid[prop as keyof HTMLRevoGridElement] as T);
    }
  }

  /**
   * Remove event listener
   * @param eventName
   */
  removeEventListener(eventName: string) {
    this.revogrid.removeEventListener(eventName, this.subscriptions[eventName]);
    delete this.subscriptions[eventName];
  }

  /**
   * Emit event from revo-grid component
   * Event can be cancelled by calling event.preventDefault() in callback
   */
  emit<T = any>(eventName: string, detail?: T) {
    const event = new CustomEvent<T>(eventName, { detail, cancelable: true });
    this.revogrid.dispatchEvent(event);
    return event;
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions() {
    for (let type in this.subscriptions) {
      this.removeEventListener(type);
    }
  }

  /**
   * Destroy plugin and clear all subscriptions
   */
  destroy() {
    this.clearSubscriptions();
    this.watchCleanups.forEach(cleanup => cleanup());
    this.watchCleanups.length = 0;
  }
}

export type GridPlugin = (typeof BasePlugin);
