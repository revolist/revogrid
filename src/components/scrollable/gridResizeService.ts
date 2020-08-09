import {Module} from '../../services/module.interfaces';
import {DimensionType} from '../../interfaces';

interface Events {
    resize(type: DimensionType, size: number): void;
}
export default class GridResizeService implements Module {
    private resizeObserver: ResizeObserver;
    constructor(el: HTMLElement, private events: Events) {
        this.init(el);
    }

    private async init(el: HTMLElement): Promise<void> {
        if (!('ResizeObserver' in window)) {
            const module = await import('@juggle/resize-observer');
            window.ResizeObserver = (module.ResizeObserver as unknown as typeof ResizeObserver);
        }

        this.resizeObserver = new ResizeObserver(async() => {
            this.events?.resize('row', el.clientHeight );
            this.events?.resize('col',  el.clientWidth);
        });

        this.resizeObserver.observe(el);
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
    }
}
