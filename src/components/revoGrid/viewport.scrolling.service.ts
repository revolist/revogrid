import { columnTypes } from '@store';
import {
  DimensionColPin,
  ViewPortScrollEvent,
  ElementsScroll,
  ElementScroll,
} from '@type';

export default class GridScrollingService {
  private elements: ElementsScroll = {};
  constructor(private setViewport: (e: ViewPortScrollEvent) => void) {}

  async proxyScroll(e: ViewPortScrollEvent, key?: DimensionColPin | string) {
    let newEvent: Promise<ViewPortScrollEvent>;
    let event = e;
    for (let elKey in this.elements) {
      // skip
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
          await el.setScroll?.(e);
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
  async scrollSilentService(
    e: ViewPortScrollEvent,
    key?: DimensionColPin | string,
  ) {
    for (let elKey in this.elements) {
      // skip same element update
      if (elKey === key) {
        continue;
      }
      if (
        columnTypes.includes(key as DimensionColPin) &&
        (elKey === 'headerRow' ||
          columnTypes.includes(elKey as DimensionColPin))
      ) {
        for (let el of this.elements[elKey]) {
          await el.changeScroll?.(e, true);
        }
        continue;
      }
    }
  }

  private isPinnedColumn(
    key?: DimensionColPin | string,
  ): key is DimensionColPin {
    return ['colPinStart', 'colPinEnd'].indexOf(key) > -1;
  }

  registerElements(els: ElementsScroll) {
    this.elements = els;
  }

  /**
   * Register new element for farther scroll support
   * @param el - can be null if holder removed
   * @param key - element key
   */
  registerElement(el: ElementScroll | null, key: string) {
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

  unregister() {
    delete this.elements;
    this.elements = {};
  }
}
