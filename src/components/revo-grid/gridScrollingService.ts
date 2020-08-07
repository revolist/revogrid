import {Module} from '../../services/module.interfaces';
import {DimensionSettingsState, DimensionType, ViewPortScrollEvent} from "../../interfaces";
import {getCurrentState} from "../../store/dimension/dimension.store";
import {setViewPortCoordinate} from "../../store/viewPort/viewport.store";
interface Events {
    scrollVirtual(e: ViewPortScrollEvent): void;
    scroll(e: ViewPortScrollEvent): void;
}
export default class GridScrollingService implements Module {
    private preventArtificialScroll: {[T in DimensionType]: boolean} = {
        row: false,
        col: false
    };
    constructor(private events: Events) {}

    onScroll(e: ViewPortScrollEvent): void {
        if (this.updateViewPort(e)) {
            this.events?.scrollVirtual(e);
        }
    }

    onScrollVirtual(e: ViewPortScrollEvent): void {
        if (this.updateViewPort(e)) {
            this.events?.scroll(e);
        }
    }

    destroy(): void {
        //
    }

    private updateViewPort(e: ViewPortScrollEvent): boolean {
        if (this.preventArtificialScroll[e.dimension]) {
            this.preventArtificialScroll[e.dimension] = false;
            return false;
        }
        const dimension: DimensionSettingsState = getCurrentState(e.dimension);
        setViewPortCoordinate(e.coordinate, e.dimension, dimension);
        this.preventArtificialScroll[e.dimension] = true;
        return true;
    }
}
