import {scaleValue} from '../utils/utils';
import {DimensionType, ViewPortScrollEvent} from '../interfaces';

interface Config {
    scroll(e: ViewPortScrollEvent): void;
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
    maxSize: 0
};

export default class LocalScrollService {
    private preventArtificialScroll: {[T in DimensionType]: number|null} = { row: null, col: null };
    // to check if scroll changed
    private previousScroll: {[T in DimensionType]: number} = { row: 0, col: 0 };
    private params: {[T in DimensionType]: Params} = { row: {...initialParams}, col: {...initialParams} };

    constructor(private cfg: Config) {}

    static getVirtualContentSize(contentSize: number, clientSize: number, virtualSize: number = 0): number {
        return contentSize + (virtualSize ? (clientSize - virtualSize) : 0);
    }

    setParams(params: Params, dimension: DimensionType): void {
        const virtualContentSize = LocalScrollService.getVirtualContentSize(
            params.contentSize,
            params.clientSize,
            params.virtualSize
        );
        this.params[dimension] = {
            ...params,
            maxSize: virtualContentSize - params.clientSize,
            virtualContentSize
        };
    }

    // apply scroll values after scroll done
    setScroll(target: HTMLElement, e: ViewPortScrollEvent): void {
        this.cancelScroll(e.dimension);
        this.preventArtificialScroll[e.dimension] = window.requestAnimationFrame(() => {
            const params = this.getParams(e.dimension);
            e.coordinate = Math.ceil(e.coordinate);
            this.previousScroll[e.dimension] = this.wrapCoordinate(e.coordinate, params);
            this.preventArtificialScroll[e.dimension] = null;
            const type = e.dimension === 'row' ? 'scrollTop' : 'scrollLeft';
            target[type] = params.virtualSize ? this.convert(e.coordinate, params, false) : e.coordinate;
        });
    }

    // initiate scrolling event
    scroll(coordinate: number, dimension: DimensionType, force: boolean = false): void {
        this.cancelScroll(dimension);
        if (!force && this.previousScroll[dimension] === coordinate) {
            this.previousScroll[dimension] = 0;
            return;
        }

        const param: Params = this.getParams(dimension);
        this.cfg.scroll({
            dimension: dimension,
            coordinate: param.virtualSize ? this.convert(coordinate, param) : coordinate
        });
    }

    private getParams(dimension: DimensionType): Params {
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
    private cancelScroll(dimension: DimensionType): boolean {
        if (typeof this.preventArtificialScroll[dimension] === 'number') {
            window.cancelAnimationFrame(this.preventArtificialScroll[dimension]);
            this.preventArtificialScroll[dimension] = null;
            return true;
        }
        return false;
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
