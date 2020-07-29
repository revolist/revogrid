import {setViewport} from "../../store/viewport.store";
import {Module} from "../../services/module.interfaces";

export default class GridResizeService implements Module {
    private resizeObserver: ResizeObserver;
    constructor(el: HTMLElement, private viewport: HTMLRevogrViewportScrollableElement) {
        this.init(el);
    }

    private async init(el: HTMLElement): Promise<void> {
        if (!('ResizeObserver' in window)) {
            const module = await import('@juggle/resize-observer');
            window.ResizeObserver = (module.ResizeObserver as unknown as typeof ResizeObserver);
        }

        this.resizeObserver = new ResizeObserver(async() => {
            setViewport({ virtualSize: el.clientHeight }, 'row');
            setViewport({ virtualSize: el.clientWidth }, 'col');
            await this.viewport.scrollX();
            await this.viewport.scrollY();
        });

        this.resizeObserver.observe(el);
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
    }
}
