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
  readonly apply = throttle(
    (e: { width: number, height: number }) => {
      const entry = {
        width: e.width,
        height: e.height,
      };
      this.resize?.(entry, this.previousSize);
      this.previousSize = entry;
    },
    40,
    {
      leading: false,
      trailing: true,
    }
  );
  constructor(
    el: HTMLElement,
    private readonly resize: (
      entry: ResizeEntry,
      previousSize: ResizeEntry,
    ) => void,
    elements: (HTMLElement | undefined)[],
  ) {
    const extras: HTMLElement[] = [];
    elements.forEach((element) => {
      if (element) {
        extras.push(element);
      }
    });
    this.init(el, extras);
  }

  async init(el: HTMLElement, extras: HTMLElement[] = []): Promise<void> {
    await resizeObserver();
    const observer = this.resizeObserver = new ResizeObserver((e) => {
      if (e.length) {
        if (e[0].target === el) {
          this.apply(e[0].contentRect);
        } else {
          this.apply(el.getBoundingClientRect());
        }
      }
    });
    observer.observe(el);
    extras.forEach((extra) => {
      observer.observe(extra);
    });
  }

  public destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
