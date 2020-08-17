import {Module} from '../../services/module.interfaces';
import {DimensionSettingsState, ViewPortScrollEvent} from "../../interfaces";
import {getCurrentState} from "../../store/dimension/dimension.store";
import {setViewPortCoordinate} from "../../store/viewPort/viewport.store";
export type ElementScroll = HTMLRevogrViewportScrollElement|HTMLRevogrScrollVirtualElement;
export default class GridScrollingService implements Module {
    private elements: ElementScroll[] = [];
    constructor() {}

    onScroll(e: ViewPortScrollEvent): void {
        const dimension: DimensionSettingsState = getCurrentState(e.dimension);
        setViewPortCoordinate(e.coordinate, e.dimension, dimension);
        for (let el of this.elements) {
            el?.setScroll(e);
        }
    }

    registerElements(els: ElementScroll[]): void {
        this.elements = els;
    }

    destroy(): void {
        //
    }
}
