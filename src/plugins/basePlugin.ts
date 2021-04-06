import { RevoPlugin } from '../interfaces';

export default abstract class BasePlugin implements RevoPlugin.Plugin {
  private readonly subscriptions: Record<string, (e: CustomEvent) => void> = {};
  constructor(protected revogrid: HTMLRevoGridElement) {}
  protected addEventListener(name: string, func: (e: CustomEvent) => void) {
    this.revogrid.addEventListener(name, func);
    this.subscriptions[name] = func;
  }

  protected removeEventListener(type: string) {
    this.revogrid.removeEventListener(type, this.subscriptions[type]);
    delete this.subscriptions[type];
  }

  protected emit(eventName: string, detail?: any) {
    const event = new CustomEvent(eventName, { detail: detail, cancelable: true });
    this.revogrid.dispatchEvent(event);
    return event;
  }

  protected clearSubscriptions() {
    for (let type in this.subscriptions) {
      this.removeEventListener(type);
    }
  }

  destroy() {
    this.clearSubscriptions();
  }
}
