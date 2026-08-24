import { columnTypes } from '@store';
import {
  DimensionColPin,
  ViewPortScrollEvent,
  ElementsScroll,
  ElementScroll,
  MultiDimensionType,
} from '@type';

export default class GridScrollingService {
  private elements: ElementsScroll = {};
  constructor(private readonly setViewport: (e: ViewPortScrollEvent<MultiDimensionType>) => void) {}

  async proxyScroll(e: ViewPortScrollEvent, key?: DimensionColPin | string, skipEvent?: boolean) {
    let newEventPromise: Promise<ViewPortScrollEvent | undefined> | undefined;
    let event = e;
    for (const elKey in (skipEvent ? {} : this.elements)) {
      // skip
      if (e.dimension === 'rgCol' && elKey === 'headerRow') {
        continue;
        // pinned column only
      }
      if (this.isPinnedColumn(key) && e.dimension === 'rgCol') {
        if (elKey === key || !e.delta) {
          continue;
        }
        const changedEvent = this.changeScroll(this.elements[elKey], e);
        if (changedEvent) {
          newEventPromise = changedEvent;
        }
      } else {
        await this.setScroll(this.elements[elKey], e);
      }
    }
    const newEvent = await newEventPromise;
    if (newEvent) {
      event = newEvent;
    }
    this.setViewport(
      skipEvent && this.isPinnedColumn(key)
        ? { ...event, dimension: key }
        : event,
    );
  }

  private changeScroll(elements: ElementScroll[], e: ViewPortScrollEvent) {
    let changedEvent: Promise<ViewPortScrollEvent | undefined> | undefined;
    for (const element of elements) {
      if (element.changeScroll) {
        changedEvent = element.changeScroll(e);
      }
    }
    return changedEvent;
  }

  private async setScroll(elements: ElementScroll[], e: ViewPortScrollEvent) {
    for (const element of elements) {
      await element.setScroll?.(e);
    }
  }

  /**
   * Silent scroll update for mobile devices when we have negative scroll top
   */
  async scrollSilentService(
    e: ViewPortScrollEvent,
    key?: DimensionColPin | string,
  ) {
    for (const elKey in this.elements) {
      // skip same element update
      if (elKey === key) {
        continue;
      }
      if (
        columnTypes.includes(key as DimensionColPin) &&
        (elKey === 'headerRow' ||
          columnTypes.includes(elKey as DimensionColPin))
      ) {
        for (const el of this.elements[elKey]) {
          await el.changeScroll?.(e, true);
        }
        continue;
      }
    }
  }

  private isPinnedColumn(
    key?: DimensionColPin | string,
  ): key is DimensionColPin {
    return !!key && ['colPinStart', 'colPinEnd'].includes(key);
  }

  registerElements(els: ElementsScroll) {
    this.elements = els;
  }

  /**
   * Register new element for farther scroll support
   * @param el - can be null if holder removed
   * @param key - element key
   */
  registerElement(el: ElementScroll | null | undefined, key: string) {
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
    this.elements = {};
  }
}
