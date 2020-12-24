/**
 * Plugin module for revo-grid grid system
 * Add support for automatic column resize
 */
import each from 'lodash/each';
import reduce from 'lodash/reduce';

import { RevoGrid, RevoPlugin, Edition } from '../interfaces';
import ColumnDataProvider, { ColumnCollection } from '../services/column.data.provider';
import { DataProvider } from '../services/data.provider';
import { columnTypes } from '../store/storeTypes';
import DimensionProvider, {ColumnItems} from '../services/dimension.provider';

interface Column extends RevoGrid.ColumnRegular {
    index: number;
}

type AutoSizeColumns = Record<RevoGrid.DimensionCols, ColumnRecords>;
type ColumnRecords = Record<any, Column>;
type SourceSetEvent = {type: RevoGrid.DimensionRows; source: RevoGrid.DataType[];};
type EditEvent = Edition.BeforeSaveDataDetails|Edition.BeforeRangeSaveDataDetails;
type Resolve = (cols: Partial<AutoSizeColumns>) => void;
type Reject = () => void;

export type AutoSizeColumnConfig = {
    // ui behavior mode
    mode?: ColumnAutoSizeMode;
    /** 
     * autoSize for all columns
     * if allColumnes true all columns treated as autoSize, worse for performance
     * false by default 
    */
    allColumns?: boolean;
    /** 
     * assumption per characted size 
     * by default defined as 8, can be changed in this config
     */
    letterBlockSize?: number;
    /** make size calculation exact
     * by default it based on assumption each character takes some space defined in letterBlockSize */
    preciseSize?: boolean;
};

const LETTER_BLOCK_SIZE = 7;

enum ColumnAutoSizeMode {
    // increases column width on header click according the largest text value
    headerClickAutosize = 'headerClickAutoSize',
    // increases column width on data set and text edit, decreases performance
    autoSizeOnTextOverlap = 'autoSizeOnTextOverlap',
    // increases and decreases column width based on all items sizes, worst for performance
    autoSizeAll = 'autoSizeAll'
}

export default class AutoSizeColumn implements RevoPlugin.Plugin {
    private autoSizeColumns: Partial<AutoSizeColumns>|null = null;
    private readonly subscriptions: Record<string, ((e: CustomEvent) => void)> = {};
    private readonly letterBlockSize: number;

    /** for config option when @preciseSize enabled */
    private readonly precsizeCalculationArea: HTMLElement;

    /** for edge case when no columns defined before data */
    private dataResolve: Resolve|null = null;
    private dataReject: Reject|null = null;

    constructor(private revogrid: HTMLRevoGridElement, private providers: {
        dataProvider: DataProvider,
        dimensionProvider: DimensionProvider,
        columnProvider: ColumnDataProvider
    }, private config?: AutoSizeColumnConfig) {
        this.letterBlockSize = config?.letterBlockSize || LETTER_BLOCK_SIZE;

        // create test container to check text width
        if (config?.preciseSize) {
            this.precsizeCalculationArea = this.initiatePresizeElement();
            revogrid.appendChild(this.precsizeCalculationArea);
        }

        const afterSourceSet = ({detail: {source}}: CustomEvent<SourceSetEvent>) => {
            this.setSource(source);
        };
        const afterEdit = ({detail}: CustomEvent<EditEvent>) => {
            this.afterEdit(detail);
        };
        const afterEditAll = ({detail}: CustomEvent<EditEvent>) => {
            this.afterEditAll(detail);
        };
        const beforeColumnsSet = ({detail: {columns}}: CustomEvent<ColumnCollection>) => {
            this.columnSet(columns);
        };
        const headerDblClick = ({detail}: CustomEvent<RevoGrid.InitialHeaderClick>) => {
            const type = ColumnDataProvider.getColumnType(detail);
            const size = this.getColumnSize(detail.index, type);
            if (size) {
                this.providers.dimensionProvider.setDimensionSize(type, {
                    [detail.index]: size
                });
            }
        };
        this.addEventListener('beforeColumnsSet', beforeColumnsSet);
        switch(config?.mode) {
            case ColumnAutoSizeMode.autoSizeOnTextOverlap:
                this.addEventListener('afterSourceSet', afterSourceSet);
                this.addEventListener('afterEdit', afterEdit);
                break;
            case ColumnAutoSizeMode.autoSizeAll:
                this.addEventListener('afterSourceSet', afterSourceSet);
                this.addEventListener('afterEdit', afterEditAll);
                break;
            default:
                this.addEventListener('headerDblClick', headerDblClick);
                break;
        }
    }
    private addEventListener(name: string, func: ((e: CustomEvent) => void)) {
        this.revogrid.addEventListener(name, func);
        this.subscriptions[name] = func;
    }

    private async setSource(source: RevoGrid.DataType[]): Promise<void> {
        let autoSize = this.autoSizeColumns;
        if (this.dataReject) {
            this.dataReject();
            this.clearPromise()
        }

        /** If data set first and no column provided await until get one */
        if (!autoSize) {
            const request = new Promise((resolve: Resolve, reject: Reject) => {
                this.dataResolve = resolve;
                this.dataReject = reject;
            });
            try {
                autoSize = await request;
            } catch (e) {
                return;
            }
        }

        // calculate sizes
        each(autoSize, (_v, type: RevoGrid.DimensionCols) => {
            const sizes: RevoGrid.ViewSettingSizeProp = {};
            each(autoSize[type], (col) => {
                // calculate size
                col.size = sizes[col.index] =
                    source.reduce((prev, row) => Math.max(prev, this.getLength(row[col.prop])), 0);
            });
            this.providers.dimensionProvider.setDimensionSize(type, sizes);
        });
    }

    private getLength(len?: any): number {
        const padding = 15;
        if (!len) {
            return 0;
        }
        try {
            const str = len.toString();

            /**if exact calculation required proxy with html element, slow operation */ 
            if (this.config?.preciseSize) {
                this.precsizeCalculationArea.innerText = str;
                return this.precsizeCalculationArea.scrollWidth + padding * 2;
            }
            return str.length * this.letterBlockSize + padding * 2;
        } catch(e) {
            return 0;
        }
    }

    private afterEdit(e: EditEvent): void {
        let data: Record<string, RevoGrid.DataType>;
        if (this.isRangeEdit(e)) {
            data = e.data;
        } else {
            data = { 0: {[e.prop]: e.val} };
        }
        each(this.autoSizeColumns, (columns, type: RevoGrid.DimensionCols) => {
            const sizes: RevoGrid.ViewSettingSizeProp = {};

            each(columns, col => {
                // calculate size
                const size = reduce(data, (prev: number|undefined, row) => {
                    if (typeof row[col.prop] === 'undefined') {
                        return prev;
                    }
                    return Math.max(prev || 0, this.getLength(row[col.prop]));
                }, undefined);

                if (size && col.size < size) {
                    col.size = sizes[col.index] = size;
                }
            });

            this.providers.dimensionProvider.setDimensionSize(type, sizes);
        });
    }

    private afterEditAll(e: EditEvent): void {
        const props: Record<any, true> = {};
        if (this.isRangeEdit(e)) {
            each(e.data, (r) =>
                each(r, (_v, p) => props[p] = true));
        } else {
            props[e.prop] = true;
        }
        each(this.autoSizeColumns, (columns, type: RevoGrid.DimensionCols) => {
            const sizes: RevoGrid.ViewSettingSizeProp = {};

            each(columns, col => {
                if (props[col.prop]) {
                    const size = this.getColumnSize(col.index, type);
                    if (size) {
                        sizes[col.index] = size;
                    }
                }
            });
            this.providers.dimensionProvider.setDimensionSize(type, sizes);
        });
    }

    private getColumnSize(index: number, type: RevoGrid.DimensionCols): number {
        const col = this.autoSizeColumns[type][index];
        if (!col) {
            return 0;
        }
        return reduce(this.providers.dataProvider.stores, (r, s) => {
            const perStore = reduce(s.store.get('items'), (prev, row) => {
                return Math.max(prev || 0, this.getLength(row[col.prop]));
            }, 0);
            return Math.max(r, perStore);
        }, col.size || 0);
    }

    private columnSet(columns: ColumnItems): void {
        for (let t of columnTypes) {
            const type = t as RevoGrid.DimensionCols;
            const cols = columns[type];

            for (let i in cols) {
                if (cols[i].autoSize || this.config?.allColumns) {
                    if (!this.autoSizeColumns) {
                        this.autoSizeColumns = {};
                    }
                    if (!this.autoSizeColumns[type]) {
                        this.autoSizeColumns[type] = {};
                    }
                    this.autoSizeColumns[type][i] = {
                        ...cols[i],
                        index: parseInt(i, 10)
                    };
                }
            }
        }

        if (this.dataResolve) {
            this.dataResolve(this.autoSizeColumns);
            this.clearPromise();
        }
    }

    private clearPromise() {
        this.dataResolve = null;
        this.dataReject = null;
    }

    private isRangeEdit(e: EditEvent): e is Edition.BeforeRangeSaveDataDetails {
        return !!(e as Edition.BeforeRangeSaveDataDetails).data;
    }

    private initiatePresizeElement(): HTMLElement {
        const styleForFontTest: Partial<CSSStyleDeclaration> = {
            position: 'absolute',
            fontSize: '14px',
            height: '0',
            width: '0',
            whiteSpace: 'nowrap',
            top: '0',
            overflowX: 'scroll'
        };

        const el = document.createElement('div');
        for (let s in styleForFontTest) {
            el.style[s] = styleForFontTest[s];
        }
        el.classList.add('revo-test-container');
        return el;
    }


    destroy() {
        for (let type in this.subscriptions) {
            this.revogrid.removeEventListener(type, this.subscriptions[type]);
        }
        this.precsizeCalculationArea?.remove();
    }
}