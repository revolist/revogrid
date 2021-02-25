import { RevoGrid } from '../../interfaces';

export interface ElementScroll {
  changeScroll?(e: RevoGrid.ViewPortScrollEvent): Promise<RevoGrid.ViewPortScrollEvent>;
  setScroll(e: RevoGrid.ViewPortScrollEvent): Promise<void>;
}
export type ElementsScroll = { [key: string]: ElementScroll[] };
export default class GridScrollingService {
  private elements: ElementsScroll = {};
  constructor(private setViewport: (e: RevoGrid.ViewPortScrollEvent) => void) {}

  async onScroll(e: RevoGrid.ViewPortScrollEvent, key?: RevoGrid.DimensionColPin | string): Promise<void> {
    let newEvent: Promise<RevoGrid.ViewPortScrollEvent>;
    for (let elKey in this.elements) {
      if (this.isPinnedColumn(key) && e.dimension === 'col') {
        if (elKey === key || !e.delta) {
          continue;
        }
        for (let el of this.elements[elKey]) {
          el.changeScroll && (newEvent = el.changeScroll(e));
        }
      } else {
        for (let el of this.elements[elKey]) {
          el.setScroll(e);
        }
      }
    }
    let event = e;
    if (newEvent) {
      event = await newEvent;
    }
    this.setViewport(event);
  }

  private isPinnedColumn(key?: RevoGrid.DimensionColPin | string): key is RevoGrid.DimensionColPin {
    return ['colPinStart', 'colPinEnd'].indexOf(key) > -1;
  }

  registerElements(els: ElementsScroll): void {
    this.elements = els;
  }

  /**
   * Register new element for farther scroll support
   * @param el - can be null if holder removed
   * @param key - element key
   */
  registerElement(el: ElementScroll | null, key: string): void {
    if (!this.elements[key]) {
      this.elements[key] = [];
    }
    // new element added
    if (el) {
      this.elements[key].push(el);
    } else if (this.elements[key]) {
      // element removed
      delete this.elements[key];
    }
  }

  unregister(): void {
    delete this.elements;
    this.elements = {};
  }
}
