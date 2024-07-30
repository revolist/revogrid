import type { DimensionType, ViewPortScrollEvent } from '@type';
import { scaleValue } from '../utils';

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
  return contentSize + (virtualSize ? clientSize - virtualSize : 0);
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
  private params: Record<DimensionType, Params> = {
    rgRow: { ...initialParams },
    rgCol: { ...initialParams },
  };

  constructor(private cfg: Config) {}

  setParams(params: Params, dimension: DimensionType) {
    const virtualContentSize = getContentSize(
      params.contentSize,
      params.clientSize,
      params.virtualSize,
    );
    this.params[dimension] = {
      ...params,
      maxSize: virtualContentSize - params.clientSize,
      virtualContentSize,
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
      this.previousScroll[e.dimension] = this.wrapCoordinate(
        e.coordinate,
        params,
      );
      this.preventArtificialScroll[e.dimension] = null;
      this.cfg.applyScroll({
        ...e,
        coordinate: params.virtualSize
          ? this.convert(e.coordinate, params, false)
          : e.coordinate,
      });
    } catch (id) {
      window.cancelAnimationFrame(id);
    }
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
    // let component know about scroll event started
    this.cfg.runScroll({
      dimension: dimension,
      coordinate: param.virtualSize
        ? this.convert(coordinate, param)
        : coordinate,
      delta,
      outside,
    });
  }

  private getParams(dimension: DimensionType): Params {
    return this.params[dimension];
  }

  // check if scroll outside of region to avoid looping
  private wrapCoordinate(c: number, param: Params): number {
    if (c < 0) {
      return NO_COORDINATE;
    }

    if (param.maxSize && c > param.maxSize) {
      return param.maxSize;
    }
    return c;
  }

  // prevent already started scroll, performance optimization
  private cancelScroll(dimension: DimensionType) {
    this.preventArtificialScroll[dimension]?.();
    this.preventArtificialScroll[dimension] = null;
  }

  /* convert virtual to real and back, scale range */
  private convert(pos: number, param: Params, toReal = true): number {
    const minRange = param.clientSize;
    const from: [number, number] = [0, (param.virtualContentSize ?? minRange) - minRange];
    const to: [number, number] = [0, param.contentSize - param.virtualSize];
    if (toReal) {
      return scaleValue(pos, from, to);
    }
    return scaleValue(pos, to, from);
  }
}
