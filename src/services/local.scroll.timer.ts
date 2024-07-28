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

  /**
   * Check if scroll is ready to accept new value
   */
  isReady(type: DimensionType, coordinate: number) {
    const change = new Date().getTime() - this.mouseWheelScrollTimestamp[type];
    // apply after throttling
    return (
      change > this.scrollThrottling &&
      coordinate !== this.lastKnownScrollCoordinate[type]
    );
  }
}
