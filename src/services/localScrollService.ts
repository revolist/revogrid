import { scaleValue } from '../utils';
import { RevoGrid } from '../interfaces';

interface Config {
  beforeScroll(e: RevoGrid.ViewPortScrollEvent): void;
  afterScroll(e: RevoGrid.ViewPortScrollEvent): void;
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

export default class LocalScrollService {
  private preventArtificialScroll: Record<RevoGrid.DimensionType, () => void | null> = { rgRow: null, rgCol: null };
  // to check if scroll changed
  private previousScroll: Record<RevoGrid.DimensionType, number> = { rgRow: 0, rgCol: 0 };
  private params: Record<RevoGrid.DimensionType, Params> = { rgRow: { ...initialParams }, rgCol: { ...initialParams } };

  constructor(private cfg: Config) {}

  static getVirtualContentSize(contentSize: number, clientSize: number, virtualSize: number = 0): number {
    return contentSize + (virtualSize ? clientSize - virtualSize : 0);
  }

  setParams(params: Params, dimension: RevoGrid.DimensionType) {
    const virtualContentSize = LocalScrollService.getVirtualContentSize(params.contentSize, params.clientSize, params.virtualSize);
    this.params[dimension] = {
      ...params,
      maxSize: virtualContentSize - params.clientSize,
      virtualContentSize,
    };
  }

  // apply scroll values after scroll done
  async setScroll(e: RevoGrid.ViewPortScrollEvent) {
    this.cancelScroll(e.dimension);

    const frameAnimation = new Promise<boolean>((resolve, reject) => {
      const animationId = window.requestAnimationFrame(() => {
        resolve(true);
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
  scroll(coordinate: number, dimension: RevoGrid.DimensionType, force: boolean = false, delta?: number) {
    this.cancelScroll(dimension);
    if (!force && this.previousScroll[dimension] === coordinate) {
      this.previousScroll[dimension] = 0;
      return;
    }

    const param: Params = this.getParams(dimension);
    this.cfg.beforeScroll({
      dimension: dimension,
      coordinate: param.virtualSize ? this.convert(coordinate, param) : coordinate,
      delta,
    });
  }

  private getParams(dimension: RevoGrid.DimensionType): Params {
    return this.params[dimension];
  }

  // check if scroll outside of region to avoid looping
  private wrapCoordinate(c: number, param: Params): number {
    if (c < 0) {
      return 0;
    }

    if (c > param.maxSize) {
      return param.maxSize;
    }
    return c;
  }

  // prevent already started scroll, performance optimization
  private cancelScroll(dimension: RevoGrid.DimensionType) {
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
