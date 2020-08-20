import {Component, Prop, h, Host, Watch, Listen, Element} from '@stencil/core';
import {ObservableMap} from '@stencil/store';
import {UUID} from '../../utils/consts';
import dataStore from '../../store/dataSource/data.store';
import dimensionProvider from '../../services/dimension.provider';
import selectionStoreConnector from '../../store/selection/selection.store.connector';
import viewportStore, {setViewport} from '../../store/viewPort/viewport.store';
import dimensionStore from '../../store/dimension/dimension.store';
import GridScrollingService, {ElementScroll} from './gridScrollingService';
import CellSelectionService from '../overlay/selection/cellSelectionService';
import {
    ColumnDataSchemaRegular, DimensionColPin, DimensionSettingsState, MultiDimensionType, Selection,
    ViewPortResizeEvent,
    ViewSettingSizeProp,
    VirtualPositionItem
} from '../../interfaces';

type Properties = {[key: string]: any};
type ViewportData = {
    lastCell: Selection.Cell;
    dataPosition: Selection.Cell;
    colData: ColumnDataSchemaRegular[];
    dimensionRow: ObservableMap<DimensionSettingsState>;
    dimensionCol: ObservableMap<DimensionSettingsState>;
    cols: VirtualPositionItem[];
    rows: VirtualPositionItem[];
};
type ViewportProps = {
    prop: Properties;
    headerProp: Properties;
    parent: string;
    dataPart: ViewportData;
    dataPartTop: ViewportData;
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

        const contentHeight = dimensionStore.row.get('realSize');
        const hostProp = { [`${UUID}`]: this.uuid };

        const pinnedColumn = (
            key: MultiDimensionType,
            uuid: string,
            rows: VirtualPositionItem[],
            colType: DimensionColPin,
            dataPosition: Selection.Cell
        ) => {
            const cols: VirtualPositionItem[] = viewportStore[colType].get('items');
            const pinSize = dimensionStore[colType].get('realSize');
            const parent: string = `[${UUID}="${uuid}"]`;
            const prop: Properties = {
                contentWidth: pinSize,
                style: { width: `${pinSize}px` },
                class: key,
                [`${UUID}`]: uuid,
                contentHeight,
                key,
            };
            const headerProp: Properties = {
                onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                    dimensionProvider.setSize(colType, e.detail),
                cols,
                parent
            };

            const lastCell = {
                x: viewportStore[colType].get('realCount'),
                y: viewportStore.row.get('realCount')
            };

            const dataPart = {
                colData: dataStore.get(colType),
                dimensionCol: dimensionStore[colType],
                dataPosition,
                cols,
                rows,
                dimensionRow: dimensionStore.row,
                lastCell,
            };
            return {
                prop,
                headerProp,
                parent,
                dataPart,
                dataPartTop: {
                    ...dataPart,
                    rows: [dataPart.rows[0]],
                    // dimensionRow: dimensionStore['rowPinStart'],
                    lastCell: { x: lastCell.x, y: 1 },
                    dataPosition: { x: dataPosition.x, y: 0 }
                }
            };
        };

        const centerData = (
            key: string,
            uuid: string,
            rows: VirtualPositionItem[],
            cols: VirtualPositionItem[],
            dataPosition: Selection.Cell
        ) => {
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
            const headerProp: Properties = {
                onHeaderResize: (e: CustomEvent<ViewSettingSizeProp>) =>
                    dimensionProvider.setSize('col', e.detail),
                cols, parent
            };
            const lastCell = {
                x: viewportStore['col'].get('realCount'),
                y: viewportStore['row'].get('realCount')
            };

            const dataPart = {
                colData: dataStore.get('columnsFlat'),
                dimensionRow: dimensionStore['row'],
                dimensionCol: dimensionStore['col'],
                lastCell,
                dataPosition,
                cols,
                rows
            };
            return {
                prop,
                headerProp,
                parent,
                dataPart,
                dataPartTop: {
                    ...dataPart,
                    rows: [dataPart.rows[0]],
                    // dimensionRow: dimensionStore['rowPinStart'],
                    lastCell: { x: lastCell.x, y: 1 },
                    dataPosition: { x: dataPosition.x, y: 0 }
                }
            };
        };

        const viewVerticalPorts: ViewportProps[] = [
            // left side
            pinnedColumn('colPinStart', `${this.uuid}-1`, rows, 'colPinStart', {x: 0, y: 1}),

            // right side
            pinnedColumn('colPinEnd', `${this.uuid}-2`, rows, 'colPinEnd', {x: 2, y: 1}),

            // center
            centerData('data-view', `${this.uuid}-0`, rows, cols, {x: 1, y: 1}),
        ];

        const viewPortHtml = [];
        for (let view of viewVerticalPorts) {
            viewPortHtml.push(
                <revogr-viewport-scroll {...view.prop}
                    ref={el => this.elementToScroll.push(el)}
                    onScrollViewport={e => this.scrollingService.onScroll(e.detail, view.prop.key)}>

                    <revogr-header
                        {...view.headerProp}
                        slot='header'
                        canResize={this.resize}
                        colData={view.dataPart.colData}/>
                    <revogr-data
                        slot='content'
                        rows={view.dataPart.rows}
                        cols={view.dataPart.cols}
                        colData={view.dataPart.colData}
                        readonly={this.readonly}
                        range={this.range}
                        dimensionCol={view.dataPart.dimensionCol}
                        dimensionRow={view.dataPart.dimensionRow}
                        lastCell={view.dataPart.lastCell}
                        position={view.dataPart.dataPosition}
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
