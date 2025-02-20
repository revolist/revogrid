import throttle from 'lodash/throttle';
import { resizeObserver } from '../../utils/resize-observer.polifill';

type ResizeEntry = {
  width: number;
  height: number;
};
export default class GridResizeService {
  private resizeObserver: ResizeObserver | null = null;
  private previousSize: ResizeEntry = {
    width: 0,
    height: 0,
  };
  private apply = throttle(
    (e: ReadonlyArray<ResizeObserverEntry>) => {
      const entry = {
        width: e[0].contentRect.width,
        height: e[0].contentRect.height,
      };
      this.resize?.(entry, this.previousSize);
      this.previousSize = entry;
    },
    10,
  );
  constructor(
    el: HTMLElement,
    private resize: (
      entry: ResizeEntry,
      previousSize: ResizeEntry,
    ) => void,
  ) {
    this.init(el);
  }

  async init(el: HTMLElement): Promise<void> {
    await resizeObserver();
    this.resizeObserver = new ResizeObserver(this.apply);
    this.resizeObserver?.observe(el);
  }

  public destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
