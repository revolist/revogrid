import {Component, Element, Event, EventEmitter, h, Host, Method, Prop} from "@stencil/core";
import {rowsStore as rowDimension} from "../../store/dimension/dimension.store";
import {DimensionType, ViewPortScrollEvent} from "../../interfaces";
import {getScrollbarWidth} from "../../utils/utils";

@Component({
    tag: 'revogr-scroll-virtual'
})
export class RevogrScrollVirtual {
    private scrollSize: number = 0;
    @Element() element: HTMLElement;
    @Prop() dimension: DimensionType = 'row';
    @Event() scrollVirtual: EventEmitter<ViewPortScrollEvent>;

    @Method()
    async setScroll(e: ViewPortScrollEvent): Promise<void> {
        switch (e.dimension) {
            case 'row':
                this.element.scrollTop = e.coordinate;
                break;
        }
    }

    private scroll(): void {
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
        return <Host class='vertical-scroll' onScroll={() => this.scroll()}>
            <div style={{height: `${rowDimension.get('realSize')}px`}}/>
        </Host>;
    }
}