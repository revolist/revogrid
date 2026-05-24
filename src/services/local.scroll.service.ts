import type { DimensionType, ViewPortScrollEvent } from '@type';
import { getScrollDimension, type ScrollDimension } from './scroll.dimension.helpers';

interface Config {
  skipAnimationFrame?: boolean;
  // scroll event inited and direction cached
  // scrollingService.proxyScroll get tiggered
  // setScroll event called from scrollingService
  runScroll(e: ViewPortScrollEvent): void;
  // all operation finished, apply scroll values
  applyScroll(e: ViewPortScrollEvent): void;
}

type Params = {
  contentSize: number;
  virtualContentSize?: number;
  clientSize: number;
  virtualSize: number;
  maxSize?: number;
  maxScrollSize?: number;
  scrollDimension?: ScrollDimension;
};

const initialParams: Params = {
  contentSize: 0,
  clientSize: 0,
  virtualSize: 0,
  maxSize: 0,
};
const NO_COORDINATE = -1;

/**
 * Based on content size, client size and virtual size
 * return full size
 */
export function getContentSize(
  contentSize: number,
  clientSize: number,
  virtualSize = 0,
): number {
  return getScrollDimension({
    contentSize,
    clientSize,
    virtualSize,
  }).physicalContentSize;
}

export default class LocalScrollService {
  private preventArtificialScroll: Record<DimensionType, (() => void) | null> = {
    rgRow: null,
    rgCol: null,
  };
  // to check if scroll changed
  private previousScroll: Record<DimensionType, number> = {
    rgRow: NO_COORDINATE,
    rgCol: NO_COORDINATE,
  };
  private previousLogicalScroll: Record<DimensionType, number> = {
    rgRow: 0,
    rgCol: 0,
  };
  private params: Record<DimensionType, Params> = {
    rgRow: { ...initialParams },
    rgCol: { ...initialParams },
  };

  constructor(private cfg: Config) {}

  setParams(params: Params, dimension: DimensionType) {
    const scrollDimension = getScrollDimension(params);
    const virtualContentSize = scrollDimension.physicalContentSize;
    this.params[dimension] = {
      ...params,
      maxSize: virtualContentSize - params.clientSize,
      virtualContentSize,
      scrollDimension,
    };
  }

  // apply scroll values after scroll done
  async setScroll(e: ViewPortScrollEvent) {
    this.cancelScroll(e.dimension);

    // start frame animation
    const frameAnimation = new Promise<void>((resolve, reject) => {
      // for example safari desktop has issues with animation frame
      if (this.cfg.skipAnimationFrame) {
        return resolve();
      }
      const animationId = window.requestAnimationFrame(() => {
        resolve();
      });
      this.preventArtificialScroll[e.dimension] = reject.bind(
        null,
        animationId,
      );
    });

    try {
      await frameAnimation;
      const params = this.getParams(e.dimension);
      e.coordinate = Math.ceil(e.coordinate);
      this.previousLogicalScroll[e.dimension] = this.wrapLogicalCoordinate(e.coordinate, params);
      const physicalCoordinate = this.toPhysicalCoordinate(e.coordinate, params);
      this.previousScroll[e.dimension] = this.wrapPhysicalCoordinate(physicalCoordinate, params);
      this.preventArtificialScroll[e.dimension] = null;
      this.cfg.applyScroll({
        ...e,
        coordinate: physicalCoordinate,
      });
    } catch (id) {
      window.cancelAnimationFrame(id);
    }
  }

  async setScrollByDelta(
    e: ViewPortScrollEvent,
    currentPhysicalCoordinate: number,
  ): Promise<ViewPortScrollEvent> {
    const params = this.getParams(e.dimension);
    const baseCoordinate = this.previousScroll[e.dimension] === NO_COORDINATE
      ? this.toLogicalCoordinate(currentPhysicalCoordinate, params)
      : this.previousLogicalScroll[e.dimension];
    const coordinate = this.wrapLogicalCoordinate(
      baseCoordinate + (e.delta ?? 0),
      params,
    );
    const nextEvent = {
      ...e,
      coordinate,
    };
    await this.setScroll(nextEvent);
    return nextEvent;
  }

  /**
   * On scroll event started
   */
  scroll(
    coordinate: number,
    dimension: DimensionType,
    force = false,
    delta?: number,
    outside = false,
  ) {
    // cancel all previous scrolls for same dimension
    this.cancelScroll(dimension);

    // drop if no change
    if (!force && this.previousScroll[dimension] === coordinate) {
      this.previousScroll[dimension] = NO_COORDINATE;
      return;
    }

    const param = this.getParams(dimension);
    const logicalCoordinate = this.toLogicalScrollCoordinate(
      coordinate,
      dimension,
      param,
      delta,
    );
    // let component know about scroll event started
    this.cfg.runScroll({
      dimension: dimension,
      coordinate: logicalCoordinate,
      delta,
      outside,
    });
    this.previousLogicalScroll[dimension] = logicalCoordinate;
  }

  private getParams(dimension: DimensionType): Params {
    return this.params[dimension];
  }

  // check if scroll outside of region to avoid looping
  private wrapPhysicalCoordinate(c: number, param: Params): number {
    if (c < 0) {
      return NO_COORDINATE;
    }

    if (typeof param.maxSize === 'number' && c > param.maxSize) {
      return param.maxSize;
    }
    return c;
  }

  private wrapLogicalCoordinate(c: number, param: Params): number {
    if (c < 0) {
      return 0;
    }
    return Math.min(c, param.scrollDimension?.logicalScrollSize ?? c);
  }

  // prevent already started scroll, performance optimization
  private cancelScroll(dimension: DimensionType) {
    this.preventArtificialScroll[dimension]?.();
    this.preventArtificialScroll[dimension] = null;
  }

  private toLogicalScrollCoordinate(
    coordinate: number,
    dimension: DimensionType,
    param: Params,
    delta?: number,
  ): number {
    const scrollDimension = param.scrollDimension;
    if (!scrollDimension) {
      return coordinate;
    }
    if (typeof delta === 'number' && scrollDimension.isCompressed) {
      const base = this.previousScroll[dimension] === NO_COORDINATE
        ? scrollDimension.toLogicalCoordinate(coordinate - delta)
        : this.previousLogicalScroll[dimension];
      return scrollDimension.toLogicalCoordinate(
        scrollDimension.toPhysicalCoordinate(base + delta),
      );
    }
    return scrollDimension.toLogicalCoordinate(coordinate);
  }

  private toPhysicalCoordinate(coordinate: number, param: Params): number {
    return param.scrollDimension?.toPhysicalCoordinate(coordinate) ?? coordinate;
  }

  private toLogicalCoordinate(coordinate: number, param: Params): number {
    return param.scrollDimension?.toLogicalCoordinate(coordinate) ?? coordinate;
  }
}
