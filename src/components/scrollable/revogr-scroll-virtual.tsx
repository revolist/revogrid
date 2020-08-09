import {Component, Element, Event, EventEmitter, h, Host, Method, Prop} from "@stencil/core";
import {DimensionType, ViewPortScrollEvent} from "../../interfaces";
import {getScrollbarWidth} from "../../utils/utils";

@Component({
    tag: 'revogr-scroll-virtual'
})
export class RevogrScrollVirtual {
    private scrollSize: number = 0;
    private preventArtificialScroll: {[T in DimensionType]: boolean} = { row: false, col: false };
    @Element() element: HTMLElement;
    @Prop() dimension: DimensionType = 'row';
    @Prop() contentSize: number = 0;
    @Event() scrollVirtual: EventEmitter<ViewPortScrollEvent>;

    @Method()
    async setScroll(e: ViewPortScrollEvent): Promise<void> {
        this.preventArtificialScroll[e.dimension] = true;
        switch (e.dimension) {
            case 'row':
                this.element.scrollTop = e.coordinate;
                break;
        }
    }

    private scroll(): void {
        if (this.preventArtificialScroll[this.dimension]) {
            this.preventArtificialScroll[this.dimension] = false;
            return;
        }
        const target: HTMLElement|undefined = this.element;
        const top: number = target?.scrollTop || 0;
        this.scrollVirtual.emit({
            dimension: this.dimension,
            coordinate: top
        });
    };


    componentWillLoad(): void {
        this.scrollSize = getScrollbarWidth(document);
    }

    componentDidRender(): void {
        // has vertical scroll
        if (this.element.scrollHeight > this.element.clientHeight) {
            const scrollSize: number = this.scrollSize; // || 20
            // this.element.style.top = `${this.header.clientHeight}px`;
            this.element.style.width = `${scrollSize}px`;
            // this.verticalScroll.style.marginRight = `${scrollSize}px`;
        } else {
            this.element.style.width = '0';
            // this.verticalScroll.style.marginRight = '0';
        }

        // has horizontal scroll
        /*
        if (this.horizontalScroll.scrollWidth > this.horizontalScroll.clientWidth) {
            this.element.style.bottom = `${this.scrollSize}px`;
        } else {
            this.element.style.bottom = '0';
        } */
    }

    render() {
        return <Host onScroll={() => this.scroll()}>
            <div style={{height: `${this.contentSize}px`}}/>
        </Host>;
    }
}