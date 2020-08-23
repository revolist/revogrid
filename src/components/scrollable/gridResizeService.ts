interface Events {
    resize(): void;
}
export default class GridResizeService {
    private resizeObserver: ResizeObserver|null = null;
    constructor(el: HTMLElement, private events: Events) {
        this.init(el);
    }

    async init(el: HTMLElement): Promise<void> {
        if (!('ResizeObserver' in window)) {
            const module = await import('@juggle/resize-observer');
            window.ResizeObserver = (module.ResizeObserver as unknown as typeof ResizeObserver);
        }

        this.resizeObserver = new ResizeObserver(async() => {
            this.events?.resize();
        });

        this.resizeObserver?.observe(el);
    }

    public destroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }
}
