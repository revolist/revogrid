/**
 * Plugin module for revo-grid grid system
 * Add support for automatic column resize
 */
import each from 'lodash/each';
import reduce from 'lodash/reduce';
import { BasePlugin } from './base.plugin';
import ColumnDataProvider, { ColumnCollection } from '../services/column.data.provider';
import { columnTypes } from '../store/storeTypes';
import { ColumnItems } from '../services/dimension.provider';
import { getSourceItem } from '../store/dataSource/data.store';
import { DimensionCols, DimensionRows } from '..';
import { ColumnRegular, DataType, InitialHeaderClick, ViewSettingSizeProp } from '..';
import { BeforeSaveDataDetails, BeforeRangeSaveDataDetails } from '..';
import { PluginProviders } from '../';

interface Column extends ColumnRegular {
  index: number;
}

type AutoSizeColumns = Record<DimensionCols, ColumnRecords>;
type ColumnRecords = Record<any, Column>;
type SourceSetEvent = { type: DimensionRows; source: DataType[] };
type EditEvent = BeforeSaveDataDetails | BeforeRangeSaveDataDetails;
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
  autoSizeAll = 'autoSizeAll',
}

export default class AutoSizeColumnPlugin extends BasePlugin {
  private autoSizeColumns: Partial<AutoSizeColumns> | null = null;
  private readonly letterBlockSize: number;

  /** for config option when @preciseSize enabled */
  private readonly precsizeCalculationArea: HTMLElement;

  /** for edge case when no columns defined before data */
  private dataResolve: Resolve | null = null;
  private dataReject: Reject | null = null;

  constructor(revogrid: HTMLRevoGridElement, protected providers: PluginProviders, private config?: AutoSizeColumnConfig) {
    super(revogrid, providers);
    this.letterBlockSize = config?.letterBlockSize || LETTER_BLOCK_SIZE;

    // create test container to check text width
    if (config?.preciseSize) {
      this.precsizeCalculationArea = this.initiatePresizeElement();
      revogrid.appendChild(this.precsizeCalculationArea);
    }

    const aftersourceset = ({ detail: { source } }: CustomEvent<SourceSetEvent>) => {
      this.setSource(source);
    };
    const afteredit = ({ detail }: CustomEvent<EditEvent>) => {
      this.afteredit(detail);
    };
    const afterEditAll = ({ detail }: CustomEvent<EditEvent>) => {
      this.afterEditAll(detail);
    };
    const beforecolumnsset = ({ detail: { columns } }: CustomEvent<ColumnCollection>) => {
      this.columnSet(columns);
    };
    const headerDblClick = ({ detail }: CustomEvent<InitialHeaderClick>) => {
      const type = ColumnDataProvider.getColumnType(detail.column);
      const size = this.getColumnSize(detail.index, type);
      if (size) {
        this.providers.dimension.setCustomSizes(type, {
          [detail.index]: size,
        }, true);
      }
    };
    this.addEventListener('beforecolumnsset', beforecolumnsset);
    switch (config?.mode) {
      case ColumnAutoSizeMode.autoSizeOnTextOverlap:
        this.addEventListener('aftersourceset', aftersourceset);
        this.addEventListener('afteredit', afteredit);
        break;
      case ColumnAutoSizeMode.autoSizeAll:
        this.addEventListener('aftersourceset', aftersourceset);
        this.addEventListener('afteredit', afterEditAll);
        break;
      default:
        this.addEventListener('headerdblclick', headerDblClick);
        break;
    }
  }

  private async setSource(source: DataType[]): Promise<void> {
    let autoSize = this.autoSizeColumns;
    if (this.dataReject) {
      this.dataReject();
      this.clearPromise();
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
    each(autoSize, (_v, type: DimensionCols) => {
      const sizes: ViewSettingSizeProp = {};
      each(autoSize[type], rgCol => {
        // calculate size
        rgCol.size = sizes[rgCol.index] = source.reduce((prev, rgRow) => Math.max(prev, this.getLength(rgRow[rgCol.prop])), this.getLength(rgCol.name || ''));
      });
      this.providers.dimension.setCustomSizes(type, sizes, true);
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
    } catch (e) {
      return 0;
    }
  }

  private afteredit(e: EditEvent) {
    let data: Record<string, DataType>;
    if (this.isRangeEdit(e)) {
      data = e.data;
    } else {
      data = { 0: { [e.prop]: e.val } };
    }
    each(this.autoSizeColumns, (columns, type: DimensionCols) => {
      const sizes: ViewSettingSizeProp = {};

      each(columns, rgCol => {
        // calculate size
        const size = reduce(
          data,
          (prev: number | undefined, rgRow) => {
            if (typeof rgRow[rgCol.prop] === 'undefined') {
              return prev;
            }
            return Math.max(prev || 0, this.getLength(rgRow[rgCol.prop]));
          },
          undefined,
        );

        if (size && rgCol.size < size) {
          rgCol.size = sizes[rgCol.index] = size;
        }
      });

      this.providers.dimension.setCustomSizes(type, sizes, true);
    });
  }

  private afterEditAll(e: EditEvent) {
    const props: Record<any, true> = {};
    if (this.isRangeEdit(e)) {
      each(e.data, r => each(r, (_v, p) => (props[p] = true)));
    } else {
      props[e.prop] = true;
    }
    each(this.autoSizeColumns, (columns, type: DimensionCols) => {
      const sizes: ViewSettingSizeProp = {};

      each(columns, rgCol => {
        if (props[rgCol.prop]) {
          const size = this.getColumnSize(rgCol.index, type);
          if (size) {
            sizes[rgCol.index] = size;
          }
        }
      });
      this.providers.dimension.setCustomSizes(type, sizes, true);
    });
  }

  private getColumnSize(index: number, type: DimensionCols): number {
    const rgCol = this.autoSizeColumns[type][index];
    if (!rgCol) {
      return 0;
    }
    return reduce(
      this.providers.data.stores,
      (r, s) => {
        const perStore = reduce(
          s.store.get('items'),
          (prev, _row, i) => {
            const item = getSourceItem(s.store, i);
            return Math.max(prev || 0, this.getLength(item[rgCol.prop]));
          },
          0,
        );
        return Math.max(r, perStore);
      },
      rgCol.size || 0,
    );
  }

  private columnSet(columns: ColumnItems) {
    for (let t of columnTypes) {
      const type = t as DimensionCols;
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
            index: parseInt(i, 10),
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

  private isRangeEdit(e: EditEvent): e is BeforeRangeSaveDataDetails {
    return !!(e as BeforeRangeSaveDataDetails).data;
  }

  private initiatePresizeElement(): HTMLElement {
    const styleForFontTest: Partial<CSSStyleDeclaration> = {
      position: 'absolute',
      fontSize: '14px',
      height: '0',
      width: '0',
      whiteSpace: 'nowrap',
      top: '0',
      overflowX: 'scroll',
    };

    const el = document.createElement('div');
    for (let s in styleForFontTest) {
      el.style[s] = styleForFontTest[s];
    }
    el.classList.add('revo-test-container');
    return el;
  }

  destroy() {
    super.destroy();
    this.precsizeCalculationArea?.remove();
  }
}
