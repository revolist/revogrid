import { RevoPlugin } from "../interfaces";

export default abstract class BasePlugin implements RevoPlugin.Plugin  {
    private readonly subscriptions: Record<string, ((e: CustomEvent) => void)> = {};
    constructor(protected revogrid: HTMLRevoGridElement) {}
    protected addEventListener(name: string, func: ((e: CustomEvent) => void)) {
        this.revogrid.addEventListener(name, func);
        this.subscriptions[name] = func;
    }

    protected emit(eventName: string, detail?: any) {
		const event = new CustomEvent(eventName, { detail: detail, cancelable: true });
        this.revogrid.dispatchEvent(event);
        return event;
    }

    destroy() {
        for (let type in this.subscriptions) {
            this.revogrid.removeEventListener(type, this.subscriptions[type]);
        }
    }
}
