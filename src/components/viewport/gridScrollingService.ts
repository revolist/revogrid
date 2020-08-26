import {DimensionColPin, ViewPortScrollEvent} from '../../interfaces';

export interface ElementScroll {
    setScroll(e: ViewPortScrollEvent): Promise<void>;
}
interface Config {
    setViewport(e: ViewPortScrollEvent): void;
}
export default class GridScrollingService {
    private elements: ElementScroll[] = [];
    constructor(private cfg: Config) {}

    onScroll(e: ViewPortScrollEvent, key?: DimensionColPin|string): void {
        if (this.isPinnedColumn(key) && e.dimension === 'col') {
            return;
        }
        this.cfg.setViewport(e);
        for (let el of this.elements) {
            el?.setScroll(e);
        }
    }

    private isPinnedColumn(key?: DimensionColPin|string): key is DimensionColPin {
        return ['colPinStart', 'colPinEnd'].indexOf(key) > -1;
    }

    registerElements(els: ElementScroll[]): void {
        this.elements = els;
    }

    destroy(): void {
        //
    }
}
