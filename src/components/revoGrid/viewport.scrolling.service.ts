import { RevoGrid } from '../../interfaces';
import { columnTypes } from '../../store/storeTypes';

export interface ElementScroll {
  changeScroll?(e: RevoGrid.ViewPortScrollEvent, silent?: boolean): Promise<RevoGrid.ViewPortScrollEvent>;
  setScroll(e: RevoGrid.ViewPortScrollEvent): Promise<void>;
}
export type ElementsScroll = { [key: string]: ElementScroll[] };
export default class GridScrollingService {
  private elements: ElementsScroll = {};
  constructor(private setViewport: (e: RevoGrid.ViewPortScrollEvent) => void) {}

  async scrollService(e: RevoGrid.ViewPortScrollEvent, key?: RevoGrid.DimensionColPin | string) {
    let newEvent: Promise<RevoGrid.ViewPortScrollEvent>;
    let event = e;
    // skip negative scroll
    if (e.coordinate < 0) {
      return;
    }
    for (let elKey in this.elements) {
      if (e.dimension === 'rgCol' && elKey === 'headerRow') {
        continue;
      // pinned column only
      } else if (this.isPinnedColumn(key) && e.dimension === 'rgCol') {
        if (elKey === key || !e.delta) {
          continue;
        }
        for (let el of this.elements[elKey]) {
          if (el.changeScroll) {
            newEvent = el.changeScroll(e);
          }
        }
      } else {
        for (let el of this.elements[elKey]) {
          await el.setScroll(e);
        }
      }
    }
    if (newEvent) {
      event = await newEvent;
    }
    this.setViewport(event);
  }

  /**
   * Silent scroll update for mobile devices when we have negative scroll top 
   */
  async scrollSilentService(e: RevoGrid.ViewPortScrollEvent, key?: RevoGrid.DimensionColPin | string) {
    for (let elKey in this.elements) {
      // skip same element update
      if (elKey === key) {
        continue;
      }
      if (columnTypes.includes(key as RevoGrid.DimensionColPin) && (elKey === 'headerRow' || columnTypes.includes(elKey  as RevoGrid.DimensionColPin))) {
        for (let el of this.elements[elKey]) {
          await el.changeScroll?.(e, true);
        }
        continue;
      }
    }
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
