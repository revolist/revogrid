import type { DimensionType } from '@type';
/**
 * Apply changes only if mousewheel event happened some time ago (scrollThrottling)
 */
export class LocalScrollTimer {
  /**
   * Last mw event time for trigger scroll function below
   * If mousewheel function was ignored we still need to trigger render
   */
  private mouseWheelScrollTimestamp: Record<DimensionType, number> = {
    rgCol: 0,
    rgRow: 0,
  };
  private lastKnownScrollCoordinate: Record<DimensionType, number> = {
    rgCol: 0,
    rgRow: 0,
  };

  constructor(private scrollThrottling = 10) {}

  setCoordinate(e: { dimension: DimensionType; coordinate: number }) {
    this.lastKnownScrollCoordinate[e.dimension] = e.coordinate;
  }

  /**
   * Remember last mw event time
   */
  latestScrollUpdate(dimension: DimensionType) {
    this.mouseWheelScrollTimestamp[dimension] = new Date().getTime();
  }

  isReady(type: DimensionType, coordinate: number) {
    // if there is a callback, clear it
    if (this.lastScrollUpdateCallbacks[type]) {
      this.clearLastScrollUpdate(type)
    }
    // apply after throttling
    return this.verifyChange(type, coordinate);
  }

  private verifyChange(type: DimensionType, coordinate: number) {
    const now = new Date().getTime();
    const change = now - this.mouseWheelScrollTimestamp[type];
    return change > this.scrollThrottling &&
    coordinate !== this.lastKnownScrollCoordinate[type];
  }

  /**
   * Check if scroll is ready to accept new value
   * this is an edge case for scroll events
   * when we need to apply scroll after throttling
   */
  private lastScrollUpdateCallbacks: Partial<Record<DimensionType, {
    callback: () => void;
    timestamp: number;
    coordinate: number;
    timeout: number;
  }>> = {};

  private clearLastScrollUpdate(type: DimensionType) {
    clearTimeout(this.lastScrollUpdateCallbacks[type]?.timeout ?? 0);
    delete this.lastScrollUpdateCallbacks[type];
  }

  throttleLastScrollUpdate(type: DimensionType, coordinate: number, lastScrollUpdate: () => void) {
    // if scrollThrottling is set
    // we need to throttle the last scroll event
    if (this.scrollThrottling) {
      this.clearLastScrollUpdate(type)
      // save lastScrollUpdate callback
      const callback = this.lastScrollUpdateCallbacks[type] = {
        callback: lastScrollUpdate,
        timestamp: new Date().getTime(),
        coordinate,
        timeout: 0 as any,
      };
      callback.timeout = setTimeout(() => {
        // clear timeout
        this.clearLastScrollUpdate(type)
        // if scrollThrottling is set, and the last scroll event happened before the timeout started
        // we need to throttle the last scroll event
        if (this.mouseWheelScrollTimestamp[type] < callback.timestamp && this.verifyChange(type, callback.coordinate)) {
          callback.callback();
        }
      }, this.scrollThrottling + 50);
    }
  }
}
