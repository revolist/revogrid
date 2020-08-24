import {Component, Prop, h, Host, Watch, Listen, Element} from '@stencil/core';
import '../../utils/closestPolifill';

import {UUID} from '../../utils/consts';
import dataStore from '../../store/dataSource/data.store';
import dimensionProvider from '../../services/dimension.provider';
import selectionStoreConnector from '../../store/selection/selection.store.connector';
import viewportStore, {setViewport} from '../../store/viewPort/viewport.store';
import dimensionStore from '../../store/dimension/dimension.store';
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import CellSelectionService from '../overlay/selection/cellSelectionService';
import {
    ColumnDataSchemaRegular,
    DimensionColPin,
    DimensionRowPin,
    MultiDimensionType,
    Selection,
    ViewPortResizeEvent,
    ViewSettingSizeProp,
    VirtualPositionItem
} from '../../interfaces';
import ViewportSpace from './viewport.interfaces';
import ViewportProps = ViewportSpace.ViewportProps;
import ViewportData = ViewportSpace.ViewportData;
import SlotType = ViewportSpace.SlotType;
import Properties = ViewportSpace.Properties;


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

    @Element() element: Element;

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

        const contentHeight: number = dimensionStore.row.get('realSize');

        const viewports: ViewportProps[] = [
            // left side
            this.pinnedColumnData(
                'colPinStart',
                `${this.uuid}-1`,
                rows,
                'colPinStart', {x: 0, y: 1},
                contentHeight
            ),

            // center
            this.centerData(
                'data-view',
                `${this.uuid}-0`,
                rows,
                cols,
                {x: 1, y: 1},
                contentHeight
            ),

            // right side
            this.pinnedColumnData(
                'colPinEnd',
                `${this.uuid}-2`, rows,
                'colPinEnd', {x: 2, y: 1},
                contentHeight
            )
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
                        key={view.prop.key + (++j)}
                        readonly={this.readonly}
                        range={this.range}
                    />);
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
                        virtualSize={viewportStore.row.get('virtualSize')}
                        onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
                </div>
            </div>
            <revogr-scroll-virtual
                class='horizontal'
                dimension='col'
                contentSize={dimensionStore.col.get('realSize')}
                ref={el => this.elementToScroll.push(el)}
                virtualSize={viewportStore.col.get('virtualSize')}
                onScrollVirtual={e => this.scrollingService.onScroll(e.detail)}/>
        </Host>;
    }

    /** Collect data for pinned columns in required @ViewportProps format */
    private pinnedColumnData(
        key: MultiDimensionType,
        uuid: string,
        rows: VirtualPositionItem[],
        colType: DimensionColPin,
        position: Selection.Cell,
        contentHeight: number
    ): ViewportProps {
        const cols: VirtualPositionItem[] = viewportStore[colType].get('items');
        const pinSize = dimensionStore[colType].get('realSize');
        const parent: string = `[${UUID}="${uuid}"]`;
        const prop: Properties = {
            contentWidth: pinSize,
            style: { minWidth: `${pinSize}px` },
            class: key,
            [`${UUID}`]: uuid,
            contentHeight,
            key,
        };
        const colData = dataStore.get(colType);
        const headerProp: Properties = {
            cols,
            parent,
            colData,
            onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                dimensionProvider.setDimensionSize(colType, e.detail)
        };

        return {
            prop,
            headerProp,
            parent,
            dataPorts: this.dataViewPort(rows, cols, colData, colType, position, uuid)
        };
    };


    /** Collect data for central(core) part */
    private centerData (
        key: string,
        uuid: string,
        rows: VirtualPositionItem[],
        cols: VirtualPositionItem[],
        position: Selection.Cell,
        contentHeight: number
    ): ViewportProps {
        const parent = `[${UUID}="${uuid}"]`;
        const prop: Properties = {
            contentWidth: dimensionStore['col'].get('realSize'),
            class: key,
            [`${UUID}`]: uuid,
            onResizeViewport: (e: CustomEvent<ViewPortResizeEvent>) =>
                setViewport({ virtualSize:  e.detail.size}, e.detail.dimension),
            contentHeight,
            key
        };
        const colData = dataStore.get('columnsFlat');
        const headerProp: Properties = {
            colData,
            cols,
            parent,
            onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                dimensionProvider.setDimensionSize('col', e.detail)
        };
        return {
            prop,
            headerProp,
            parent,
            dataPorts: this.dataViewPort(rows, cols, colData, 'col', position, uuid)
        };
    }

    /** Collect Row data */
    private dataViewPort(
        rows: VirtualPositionItem[],
        cols: VirtualPositionItem[],
        colData: ColumnDataSchemaRegular[],
        colType: MultiDimensionType,
        position: Selection.Cell,
        uuid: string
    ): ViewportData[] {

        const dataPart: ViewportData = {
            colData,
            position,
            cols,
            rows,
            uuid,
            lastCell: this.getLastCell(colType, 'row'),
            rowType: 'row',

            slot: 'content',
            dimensionCol: dimensionStore[colType],
            dimensionRow: dimensionStore['row']
        };
        const pinned = (type: DimensionRowPin, slot: SlotType, y: number): ViewportData => {
            return {
                ...dataPart,
                slot: slot,
                rowType: type,
                rows: viewportStore[type].get('items'),
                dimensionRow: dimensionStore[type],
                lastCell: this.getLastCell(colType, type),
                position: { ...position, y },
                style: { height: `${dimensionStore[type].get('realSize')}px` }
            };
        };
        return [
            pinned('rowPinStart', 'header', 0),
            dataPart,
            pinned('rowPinEnd', 'footer', dataPart.position.y + 1)
        ];
    }


    /** Receive last visible in viewport by required type */
    private getLastCell(colType: MultiDimensionType, rowType: MultiDimensionType): Selection.Cell {
        return {
            x: viewportStore[colType].get('realCount'),
            y: viewportStore[rowType].get('realCount')
        };
    }
}
