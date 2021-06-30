import { RevoPlugin } from '../interfaces';

/**
 * Base layer for plugins
 * Provide minimal starting core
 */
export default abstract class BasePlugin implements RevoPlugin.Plugin {
  private readonly subscriptions: Record<string, (e: CustomEvent) => void> = {};
  constructor(protected revogrid: HTMLRevoGridElement) { }
  /**
   * 
   * @param eventName - event name to subscribe to in revo-grid 
   * @param callback - callback function for event 
   */
  protected addEventListener(eventName: string, callback: (e: CustomEvent) => void) {
    this.revogrid.addEventListener(eventName, callback);
    this.subscriptions[eventName] = callback;
  }

  /**
   * Remove event subscription
   * @param eventName 
   */
  protected removeEventListener(eventName: string) {
    this.revogrid.removeEventListener(eventName, this.subscriptions[eventName]);
    delete this.subscriptions[eventName];
  }

  /**
   * Trigger event to grid upper level
   * Event can be cancelled
   * @param eventName 
   * @param detail 
   * @returns event
   */
  protected emit(eventName: string, detail?: any) {
    const event = new CustomEvent(eventName, { detail, cancelable: true });
    this.revogrid.dispatchEvent(event);
    return event;
  }

  /**
   * Clearing inner subscription
   */
  protected clearSubscriptions() {
    for (let type in this.subscriptions) {
      this.removeEventListener(type);
    }
  }

  /**
   * Minimal destroy implementations
   */
  destroy() {
    this.clearSubscriptions();
  }
}
