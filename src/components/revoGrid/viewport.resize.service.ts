import throttle from 'lodash/throttle';
import { resizeObserver } from '../../utils/resize-observer.polifill';
interface Events {
  resize(entries: ReadonlyArray<ResizeObserverEntry>, observer: ResizeObserver): void;
}
export default class GridResizeService {
  private resizeObserver: ResizeObserver | null = null;
  private resize = throttle((e: ReadonlyArray<ResizeObserverEntry>, o: ResizeObserver) => this.events?.resize(e, o), 10);
  constructor(el: HTMLElement, private events: Events) {
    this.init(el);
  }

  async init(el: HTMLElement): Promise<void> {
    await resizeObserver();
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver?.observe(el);
  }

  public destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
