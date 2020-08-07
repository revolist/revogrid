import {setViewport} from '../../store/viewPort/viewport.store';
import {Module} from '../../services/module.interfaces';
import {DimensionType} from '../../interfaces';

interface Events {
    scroll(type: DimensionType): void;
}
export default class GridResizeService implements Module {
    private resizeObserver: ResizeObserver;
    constructor(el: HTMLRevogrViewportElement, private events: Events) {
        this.init(el);
    }

    private async init(el: HTMLRevogrViewportElement): Promise<void> {
        if (!('ResizeObserver' in window)) {
            const module = await import('@juggle/resize-observer');
            window.ResizeObserver = (module.ResizeObserver as unknown as typeof ResizeObserver);
        }

        this.resizeObserver = new ResizeObserver(async() => {
            setViewport({ virtualSize: el.clientHeight }, 'row');
            setViewport({ virtualSize: el.clientWidth }, 'col');
            this.events?.scroll('row');
            this.events?.scroll('col');
        });

        this.resizeObserver.observe(el);
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
    }
}
