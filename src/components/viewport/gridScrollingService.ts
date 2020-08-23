import {DimensionColPin, DimensionSettingsState, ViewPortScrollEvent} from '../../interfaces';
import {getCurrentState} from '../../store/dimension/dimension.store';
import {setViewPortCoordinate} from '../../store/viewPort/viewport.store';

export interface ElementScroll {
    setScroll: (e: ViewPortScrollEvent) => Promise<void>;
}

export default class GridScrollingService {
    private elements: ElementScroll[] = [];
    constructor() {}

    onScroll(e: ViewPortScrollEvent, key?: DimensionColPin|string): void {
        if (this.isPinnedColumn(key) && e.dimension === 'col') {
            return;
        }
        const dimension: DimensionSettingsState = getCurrentState(e.dimension);
        setViewPortCoordinate(e.coordinate, e.dimension, dimension);
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
