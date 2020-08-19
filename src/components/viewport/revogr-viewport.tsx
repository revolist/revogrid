import {Component, Prop, h, Host, Watch, Listen, Element} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import viewportStore, {setViewport} from '../../store/viewPort/viewport.store';
import dimensionStore from '../../store/dimension/dimension.store';
import {UUID} from '../../utils/consts';
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import dataStore from '../../store/dataSource/data.store';
import dimensionProvider from '../../services/dimension.provider';
import CellSelectionService from '../overlay/selection/cellSelectionService';
import selectionStoreConnector from '../../store/selection/selection.store.connector';
import {
    ColumnDataSchemaRegular, DimensionSettingsState, Selection,
    ViewPortResizeEvent,
    ViewSettingSizeProp,
    VirtualPositionItem
} from '../../interfaces';

type Properties = {[key: string]: any};
type ViewportProps = {
    prop: Properties;
    headerProp: Properties;
    cols: VirtualPositionItem[];
    rows: VirtualPositionItem[];
    colData: ColumnDataSchemaRegular[];
    dimensionRow: ObservableMap<DimensionSettingsState>;
    dimensionCol: ObservableMap<DimensionSettingsState>;
    parent: string;
    lastCell: Selection.Cell;
    position: Selection.Cell;
};

@Component({
    tag: 'revogr-viewport'
})
export class RevogrViewport {
    private elementToScroll: ElementScroll[] = [];
    private scrollingService: GridScrollingService;

    @Element() element: Element;
    @Prop() uuid: string|null = null;
    @Prop() resize: boolean;
    @Prop() readonly: boolean;
    @Prop() range: boolean;
    @Watch('range') onRange(canRange: boolean): void {
        CellSelectionService.canRange = canRange;
    }

    @Listen('click', { target: 'document' })
    handleOutsideClick(e: KeyboardEvent): void {
        const target: HTMLElement|null = e.target as HTMLElement;
        if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
            selectionStoreConnector.clearAll();
        }
    }

    connectedCallback(): void {
        this.scrollingService = new GridScrollingService();
        CellSelectionService.canRange = this.range;
    }

    disconnectedCallback(): void {
        this.scrollingService.destroy();
    }

    componentDidRender(): void {
        this.scrollingService.registerElements(this.elementToScroll);
    }

    render() {
        this.elementToScroll.length = 0;
        const rows: VirtualPositionItem[] = viewportStore.row.get('items');
        const cols: VirtualPositionItem[] = viewportStore.col.get('items');
        const colPinStart: VirtualPositionItem[] = viewportStore.colPinStart.get('items');

        const contentHeight = dimensionStore.row.get('realSize');
        const hostProp = { [`${UUID}`]: this.uuid };
        const pinStartSize = dimensionStore.colPinStart.get('realSize');

        const viewPorts: ViewportProps[] = [
            // left side
            ((key, uuid, rows, cols) => {
                const parent: string = `[${UUID}="${uuid}"]`;
                const prop: Properties = {
                    contentWidth: pinStartSize,
                    style: { width: `${pinStartSize}px` },
                    class: key,
                    [`${UUID}`]: uuid,
                    contentHeight,
                    key,
                };
                const headerProp: Properties = {
                    onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                        dimensionProvider.setSize('colPinStart', e.detail),
                    cols, parent
                };

                const lastCell = {
                    x: viewportStore.colPinStart.get('realCount'),
                    y: viewportStore.row.get('realCount')
                };

                return {
                    prop,
                    headerProp,
                    lastCell,
                    colData: dataStore.get('colPinStart'),
                    dimensionRow: dimensionStore.row,
                    dimensionCol: dimensionStore.colPinStart,
                    position: {x: 0, y: 0},
                    cols,
                    rows,
                    parent
                };
            })('pinned-left', `${this.uuid}-1`, rows, colPinStart),

            // center
            ((key, uuid, rows, cols) => {
                const parent = `[${UUID}="${uuid}"]`;
                const prop: Properties = {
                    contentWidth: dimensionStore.col.get('realSize'),
                    class: key,
                    [`${UUID}`]: uuid,
                    onResizeViewport: (e: CustomEvent<ViewPortResizeEvent>) =>
                        setViewport({ virtualSize:  e.detail.size}, e.detail.dimension),
                    contentHeight,
                    key
                };
                const headerProp: Properties = {
                    onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                        dimensionProvider.setSize('col', e.detail),
                    cols, parent
                };
                const lastCell = {
                    x: viewportStore.col.get('realCount'),
                    y: viewportStore.row.get('realCount')
                };
                return {
                    prop,
                    headerProp,
                    lastCell,
                    colData: dataStore.get('columnsFlat'),
                    dimensionRow: dimensionStore.row,
                    dimensionCol: dimensionStore.col,
                    position: {x: 1, y: 0},
                    cols, rows, parent
                };
            })('data-view', `${this.uuid}-0`, rows, cols),
        ];

        const viewPortHtml = [];
        for (let view of viewPorts) {
            viewPortHtml.push(
                <revogr-viewport-scroll {...view.prop}
                    ref={el => this.elementToScroll.push(el)}
                    onScrollViewport={e => this.scrollingService.onScroll(e.detail)}>
                    <revogr-header
                        {...view.headerProp}
                        slot='header'
                        class='header'
                        canResize={this.resize}
                        colData={view.colData}/>
                    <revogr-data
                        slot='content'
                        rows={view.rows}
                        cols={view.cols}
                        colData={view.colData}
                        readonly={this.readonly}
                        range={this.range}
                        dimensionCol={view.dimensionCol}
                        dimensionRow={view.dimensionRow}
                        lastCell={view.lastCell}
                        position={view.position}
                        parent={view.parent}
                    />
                </revogr-viewport-scroll>
            );
        }
        return <Host{...hostProp}>
            <revogr-scroll-virtual
                class='vertical-scroll'
                contentSize={contentHeight}
                ref={el => this.elementToScroll.push(el)}
                onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
            <div class='main-viewport'>{viewPortHtml}</div>
        </Host>;
    }
}
