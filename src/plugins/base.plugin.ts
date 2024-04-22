import { PluginProviders, PluginBaseComponent } from '..';

type WatchConfig = { immediate: boolean };

/**
 * Base layer for plugins
 * Provide minimal starting core for plugins to work
 * Extend this class to create plugin
 */
export class BasePlugin implements PluginBaseComponent {
  protected readonly subscriptions: Record<string, (...args: any[]) => void> = {};
  constructor(protected revogrid: HTMLRevoGridElement, protected providers: PluginProviders) {}
  /**
   *
   * @param eventName - event name to subscribe to in revo-grid component (e.g. 'beforeheaderclick')
   * @param callback - callback function for event
   */
  protected addEventListener(
    eventName: string,
    callback: (e: CustomEvent) => void,
  ) {
    this.revogrid.addEventListener(eventName, callback);
    this.subscriptions[eventName] = callback;
  }

  /**
   * Subscribe to property change in revo-grid component
   * You can return false in callback to prevent default value set
   *
   * @param prop - property name
   * @param callback - callback function
   * @param immediate - trigger callback immediately with current value
   */
  protected watch<T extends any>(
    prop: string,
    callback: (arg: T) => boolean | void,
    { immediate }: Partial<WatchConfig> = { immediate: false },
  ) {
    const nativeValueDesc =
      Object.getOwnPropertyDescriptor(this.revogrid, prop) ||
      Object.getOwnPropertyDescriptor(this.revogrid.constructor.prototype, prop);

    // Overwrite property descriptor for this instance
    Object.defineProperty(this.revogrid, prop, {
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
    if (immediate) {
      callback(nativeValueDesc?.value);
    }
  }

  /**
   * Remove event listener
   * @param eventName
   */
  protected removeEventListener(eventName: string) {
    this.revogrid.removeEventListener(eventName, this.subscriptions[eventName]);
    delete this.subscriptions[eventName];
  }

  /**
   * Emit event from revo-grid component
   * Event can be cancelled by calling event.preventDefault() in callback
   */
  protected emit(eventName: string, detail?: any) {
    const event = new CustomEvent(eventName, { detail, cancelable: true });
    this.revogrid.dispatchEvent(event);
    return event;
  }

  /**
   * Clear all subscriptions
   */
  protected clearSubscriptions() {
    for (let type in this.subscriptions) {
      this.removeEventListener(type);
    }
  }

  /**
   * Destroy plugin and clear all subscriptions
   */
  destroy() {
    this.clearSubscriptions();
  }
}
