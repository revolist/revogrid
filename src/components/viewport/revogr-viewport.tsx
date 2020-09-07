import {Component, Prop, h, Host, Watch, Listen, Element, Event, EventEmitter} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import '../../utils/closestPolifill';

import {UUID} from '../../utils/consts';
import {gatherColumnData} from "./viewport.helpers";
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import CellSelectionService from '../overlay/cellSelectionService';
import ViewportSpace from './viewport.interfaces';
import {DataProvider} from '../../services/data.provider';
import {DataSourceState} from '../../store/dataSource/data.store';
import SelectionStoreConnector from '../../services/selection.store.connector';
import {Edition, RevoGrid} from '../../interfaces';
import ViewportProps = ViewportSpace.ViewportProps;


/**
 * Renders viewport
 * @Component
 * @Prop uuid - grid id
 * @Prop resize - can resize grid
 * @Prop readonly - can edit grid
 * @Prop range - can change range
 * */

@Component({
    tag: 'revogr-viewport'
})
export class RevogrViewport {
    private elementToScroll: ElementScroll[] = [];
    private scrollingService: GridScrollingService;
    private selectionStoreConnector: SelectionStoreConnector;

    @Event() setDimensionSize: EventEmitter<{type: RevoGrid.MultiDimensionType, sizes: RevoGrid.ViewSettingSizeProp}>;
    @Event() setViewportCoordinate: EventEmitter<RevoGrid.ViewPortScrollEvent>;
    @Event() setViewportSize: EventEmitter<RevoGrid.ViewPortResizeEvent>;

    @Element() element: Element;
    @Prop() columnStores: {[T in RevoGrid.DimensionCols]: ObservableMap<DataSourceState<RevoGrid.ColumnDataSchemaRegular>>};
    @Prop() rowStores: {[T in RevoGrid.DimensionRows]: ObservableMap<DataSourceState<RevoGrid.DataType>>};
    @Prop() dimensions: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.DimensionSettingsState>};
    @Prop() viewports: {[T in RevoGrid.MultiDimensionType]: ObservableMap<RevoGrid.ViewportState>};


    /**
     * Custom editors register
     */
    @Prop() editors: Edition.Editors = {};

    @Prop() dataProvider: DataProvider;

    @Prop() uuid: string|null = null;
    @Prop() resize: boolean;
    @Prop() readonly: boolean;
    @Prop() range: boolean;
    @Watch('range') onRange(canRange: boolean): void {
        CellSelectionService.canRange = canRange;
    }

    /** Clear data which is outside of grid container */
    @Listen('click', { target: 'document' })
    handleOutsideClick(e: KeyboardEvent): void {
        const target: HTMLElement|null = e.target as HTMLElement;
        if (!target?.closest(`[${UUID}="${this.uuid}"]`)) {
            this.selectionStoreConnector.clearAll();
        }
    }

    connectedCallback(): void {
        this.selectionStoreConnector = new SelectionStoreConnector();
        this.scrollingService = new GridScrollingService({
            setViewport: (e: RevoGrid.ViewPortScrollEvent) => this.setViewportCoordinate.emit(e)
        });
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
        const rows: RevoGrid.VirtualPositionItem[] = this.viewports['row'].get('items');
        const contentHeight: number = this.dimensions['row'].get('realSize');

        const viewports: ViewportProps[] = [
            // left side
            gatherColumnData({
                colType: 'colPinStart',
                position: { x: 0, y: 1 },


                contentHeight: contentHeight,
                fixWidth: true,
                uuid: `${this.uuid}-0`,
                rows: rows,

                viewports: this.viewports,
                dimensions: this.dimensions,
                rowStores: this.rowStores,
                colStore: this.columnStores['colPinStart'],
                onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) =>
                    this.setDimensionSize.emit({ type: 'colPinStart', sizes: e.detail })
            }),

            // center
            gatherColumnData({
                colType: 'col',
                position: {x: 1, y: 1},


                contentHeight: contentHeight,
                uuid: `${this.uuid}-1`,
                rows: rows,

                viewports: this.viewports,
                dimensions: this.dimensions,
                rowStores: this.rowStores,
                colStore: this.columnStores['col'],
                onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) =>
                    this.setDimensionSize.emit({ type: 'col', sizes: e.detail }),
                onResizeViewport: (e: CustomEvent<RevoGrid.ViewPortResizeEvent>) =>
                    this.setViewportSize.emit(e.detail)
            }),

            // right side
            gatherColumnData({
                colType: 'colPinEnd',
                position: { x: 2, y: 1 },


                contentHeight: contentHeight,
                fixWidth: true,
                uuid: `${this.uuid}-2`,
                rows: rows,

                viewports: this.viewports,
                dimensions: this.dimensions,
                rowStores: this.rowStores,
                colStore: this.columnStores['colPinEnd'],
                onHeaderResize: (e: CustomEvent<RevoGrid.ViewSettingSizeProp>) =>
                    this.setDimensionSize.emit({ type: 'colPinEnd', sizes: e.detail })
            }),
        ];

        const viewPortHtml: HTMLElement[] = [];

        /** render viewports columns */
        for (let view of viewports) {
            const dataViews: HTMLElement[] = [];
            let j: number = 0;

            /** render viewports rows */
            for (let data of view.dataPorts) {
                dataViews.push(
                    <revogr-data
                        {...data}
                        {...{[UUID]: data.uuid}}
                        key={view.prop.key + (++j)}
                        readonly={this.readonly}
                        range={this.range}
                    >
                        <revogr-overlay-selection
                            {...data}
                            slot='overlay'
                            selectionStoreConnector={this.selectionStoreConnector}
                            editors={this.editors}
                            readonly={this.readonly}/>
                    </revogr-data>
                );
            }
            viewPortHtml.push(
                <revogr-viewport-scroll {...view.prop}
                    ref={el => this.elementToScroll.push(el)}
                    onScrollViewport={e => this.scrollingService.onScroll(e.detail, view.prop.key)}>

                    <revogr-header {...view.headerProp} slot='header' canResize={this.resize}/>
                    {dataViews}
                </revogr-viewport-scroll>
            );
        }
        return <Host{...{[`${UUID}`]: this.uuid}}>
            <div class='main-viewport'>
                <div class='viewports'>
                    {viewPortHtml}

                    <revogr-scroll-virtual
                        class='vertical'
                        contentSize={contentHeight}
                        ref={el => this.elementToScroll.push(el)}
                        virtualSize={this.viewports['row'].get('virtualSize')}
                        onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
                </div>
            </div>
            <revogr-scroll-virtual
                class='horizontal'
                dimension='col'
                contentSize={this.dimensions['col'].get('realSize')}
                ref={el => this.elementToScroll.push(el)}
                virtualSize={this.viewports['col'].get('virtualSize')}
                onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
        </Host>;
    }
}
