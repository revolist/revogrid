import { DimensionType } from '..';
import { ViewPortScrollEvent } from '..';
import { scaleValue } from '../utils';

interface Config {
  skipAnimationFrame?: boolean;
  beforeScroll(e: ViewPortScrollEvent): void;
  afterScroll(e: ViewPortScrollEvent): void;
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
export default class LocalScrollService {
  private preventArtificialScroll: Record<DimensionType, () => void | null> = { rgRow: null, rgCol: null };
  // to check if scroll changed
  private previousScroll: Record<DimensionType, number> = { rgRow: NO_COORDINATE, rgCol: NO_COORDINATE };
  private params: Record<DimensionType, Params> = { rgRow: { ...initialParams }, rgCol: { ...initialParams } };

  constructor(private cfg: Config) {}

  static getVirtualContentSize(contentSize: number, clientSize: number, virtualSize: number = 0): number {
    return contentSize + (virtualSize ? clientSize - virtualSize : 0);
  }

  setParams(params: Params, dimension: DimensionType) {
    const virtualContentSize = LocalScrollService.getVirtualContentSize(params.contentSize, params.clientSize, params.virtualSize);
    this.params[dimension] = {
      ...params,
      maxSize: virtualContentSize - params.clientSize,
      virtualContentSize,
    };
  }

  // apply scroll values after scroll done
  async setScroll(e: ViewPortScrollEvent) {
    this.cancelScroll(e.dimension);

    const frameAnimation = new Promise<void>((resolve, reject) => {
      // for example safari desktop has issues with animation frame
      if (this.cfg.skipAnimationFrame) {
        return resolve();
      }
      const animationId = window.requestAnimationFrame(() => {
        resolve();
      });
      this.preventArtificialScroll[e.dimension] = reject.bind(null, animationId);
    });
    try {
      await frameAnimation;
      const params = this.getParams(e.dimension);
      e.coordinate = Math.ceil(e.coordinate);
      this.previousScroll[e.dimension] = this.wrapCoordinate(e.coordinate, params);
      this.preventArtificialScroll[e.dimension] = null;
      this.cfg.afterScroll({
        ...e,
        coordinate: params.virtualSize ? this.convert(e.coordinate, params, false) : e.coordinate,
      });

    } catch (id) {
      window.cancelAnimationFrame(id);
    }
  }

  // initiate scrolling event
  scroll(
    coordinate: number,
    dimension: DimensionType,
    force = false,
    delta?: number,
    outside = false
  ) {
    this.cancelScroll(dimension);
    if (!force && this.previousScroll[dimension] === coordinate) {
      this.previousScroll[dimension] = NO_COORDINATE;
      return;
    }

    const param = this.getParams(dimension);
    this.cfg.beforeScroll({
      dimension: dimension,
      coordinate: param.virtualSize ? this.convert(coordinate, param) : coordinate,
      delta,
      outside
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

    if (c > param.maxSize) {
      return param.maxSize;
    }
    return c;
  }

  // prevent already started scroll, performance optimization
  private cancelScroll(dimension: DimensionType) {
    const canceler = this.preventArtificialScroll[dimension];
    if (canceler) {
      canceler();
      this.preventArtificialScroll[dimension] = null;
    }
  }

  /* convert virtual to real and back, scale range */
  private convert(pos: number, param: Params, toReal: boolean = true): number {
    const minRange: number = param.clientSize;
    const from: [number, number] = [0, param.virtualContentSize - minRange];
    const to: [number, number] = [0, param.contentSize - param.virtualSize];
    if (toReal) {
      return scaleValue(pos, from, to);
    }
    return scaleValue(pos, to, from);
  }
}
