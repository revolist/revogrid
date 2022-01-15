import { RevoPlugin, RevoGrid } from '../interfaces';

type DispatchDetail = RevoGrid.ColumnRegular | RevoGrid.ColumnTemplateProp;
type Target = HTMLElement | null;
type Event = {
  target: HTMLElement | null;
  preventDefault(): void;
};

export function dispatchElement(target: Target, eventName: string, detail: DispatchDetail): CustomEvent {
  const event = new CustomEvent(eventName, {
    detail,
    cancelable: true,
    bubbles: true,
  });
  target?.dispatchEvent(event);
  return event;
}
export function dispatch(e: Event, eventName: string, detail: DispatchDetail): CustomEvent {
  e.preventDefault();
  return dispatchElement(e.target as Target, eventName, detail);
}

/**
 * Base layer for plugins
 * Provide minimal starting core
 */
export default abstract class BasePlugin implements RevoPlugin.Plugin {
  protected readonly subscriptions: Record<string, (e?: any) => void> = {};
  constructor(protected revogrid: HTMLRevoGridElement) {}
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
