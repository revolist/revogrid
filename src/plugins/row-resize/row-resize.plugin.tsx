import type { VNode } from '@stencil/core';
import { getItemByIndex, getViewportMaxCoordinate, rowTypes } from '@store';
import type {
  BeforeRowRenderEvent,
  DimensionRows,
  PluginProviders,
  ViewPortScrollEvent,
  ViewSettingSizeProp,
} from '@type';
import { BasePlugin } from '../base.plugin';
import type {
  ResolvedRowResizeConfig,
  RowResizeCancelReason,
  RowResizeConfig,
  RowResizeEventDetail,
} from './row-resize.types';
import {
  BEFORE_GROUPING_APPLY_EVENT,
  GROUP_EXPAND_EVENT,
} from '../groupingRow/grouping.const';
import {
  clampRowResizeHeight,
  createRowResizePatch,
  getRowResizeIndexes,
  mergeRowResizeDefinitions,
  resolveRowResizeConfig,
} from './row-resize.utils';

export const ROW_RESIZE_HANDLE_CLASS = 'row-resize-handle';
export const BEFORE_ROW_RESIZE_EVENT = 'beforerowresize';
export const ROW_RESIZE_EVENT = 'rowresize';
export const AFTER_ROW_RESIZE_EVENT = 'afterrowresize';
export const ROW_RESIZE_CANCEL_EVENT = 'rowresizecancel';

type ActiveResize = {
  pointerId: number;
  rowType: DimensionRows;
  index: number;
  indexes: number[];
  startY: number;
  startHeight: number;
  currentHeight: number;
  previousSizes: ViewSettingSizeProp;
  originalCustomSizes: ViewSettingSizeProp;
  bottomAnchored: boolean;
  lastEvent: PointerEvent;
};

export class RowResizePlugin extends BasePlugin {
  private config: ResolvedRowResizeConfig;
  private enabled = false;

  private active?: ActiveResize;
  private readonly appliedDefinitionIndexes = new Map<
    DimensionRows,
    Set<number>
  >();
  private animationFrame?: number;
  private pendingHeight?: number;
  private pendingBottomAnchor = false;
  private keepBottomAnchor = false;
  private rowDefinitionRemapQueued = false;
  private readonly pendingSourceCounts = new Map<DimensionRows, number>();
  private previousBodyCursor = '';

  constructor(
    revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    config: RowResizeConfig = {},
  ) {
    super(revogrid, providers);
    this.config = resolveRowResizeConfig(config);
    if (new.target !== RowResizePlugin) {
      this.enabled = true;
      this.registerEventListeners();
    }
  }

  private registerEventListeners() {
    this.addEventListener('beforerowrender', this.decorateRow);
    this.addEventListener('beforeanysource', () => {
      this.cancel('data-change');
      this.keepBottomAnchor = false;
    });
    this.addEventListener('afteranysource', ({ detail }) => {
      this.pendingSourceCounts.set(detail.type, detail.source.length);
      this.scheduleRowDefinitionRemap();
    });
    this.addEventListener('beforesourcesortingapply', this.cancelForDataChange);
    this.addEventListener('beforesortingapply', this.cancelForDataChange);
    this.addEventListener('sortingconfigchanged', this.cancelForDataChange);
    this.addEventListener(BEFORE_GROUPING_APPLY_EVENT, this.cancelForDataChange);
    this.addEventListener('aftersortingapply', this.scheduleRowDefinitionRemap);
    this.addEventListener('beforefilterapply', this.cancelForDataChange);
    this.addEventListener('afterfilterapply', this.scheduleRowDefinitionRemap);
    this.addEventListener('beforerowdefinition', () => {
      this.cancel('data-change');
      this.scheduleRowDefinitionRemap();
    });
    this.addEventListener('afterthemechanged', this.scheduleRowDefinitionRemap);
    this.addEventListener('aftertrimmed', this.scheduleRowDefinitionRemap);
    this.addEventListener('roworderchange', this.scheduleRowDefinitionRemap);
    this.addEventListener(GROUP_EXPAND_EVENT, () => {
      if (this.keepBottomAnchor) {
        this.pendingBottomAnchor = true;
      }
      this.scheduleRowDefinitionRemap();
    });
    this.addEventListener('aftergridrender', this.applyPendingBottomAnchor);
    this.addEventListener('viewportscroll', this.updateBottomAnchorState);
    this.addEventListener('rowheaderschanged', ({ detail }) => {
      if (!detail && !this.config.fullRow) {
        this.cancel('row-headers-hidden');
      }
    });
  }

  syncGridConfig(refresh = true) {
    const { plugins = [], resizeRow } = this.revogrid;
    const isCorePlugin = this.constructor === RowResizePlugin;
    const hasConfiguredPlugin = plugins.some(
      plugin =>
        plugin !== RowResizePlugin &&
        plugin.prototype instanceof RowResizePlugin,
    );
    const enabled =
      !isCorePlugin ||
      (!hasConfiguredPlugin && !!resizeRow);
    const resizeConfig =
      typeof resizeRow === 'object' ? resizeRow : undefined;
    const config = isCorePlugin
      ? resolveRowResizeConfig(resizeConfig)
      : this.config;
    const configChanged =
      config.minHeight !== this.config.minHeight ||
      config.maxHeight !== this.config.maxHeight ||
      config.fullRow !== this.config.fullRow;
    if (enabled === this.enabled && !configChanged) {
      return;
    }

    this.cancel('config-change');
    this.config = config;
    if (enabled !== this.enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.registerEventListeners();
      } else {
        this.pendingBottomAnchor = false;
        this.keepBottomAnchor = false;
        this.rowDefinitionRemapQueued = false;
        this.pendingSourceCounts.clear();
        this.clearSubscriptions();
      }
    }
    if (refresh) {
      queueMicrotask(() => void this.revogrid.refresh());
    }
  }

  private readonly decorateRow = ({
    detail,
  }: CustomEvent<BeforeRowRenderEvent>) => {
    if (
      !this.enabled ||
      (detail.colType !== 'rowHeaders' && !this.config.fullRow)
    ) {
      return;
    }
    const handle = this.h('div', {
      'key': `row-resize-${detail.rowType}-${detail.item.itemIndex}`,
      'class': { [ROW_RESIZE_HANDLE_CLASS]: true },
      'data-row-resize-index': detail.item.itemIndex,
      'aria-hidden': 'true',
      'onPointerDown': (event: PointerEvent) =>
        this.startResize(event, detail.rowType, detail.item.itemIndex),
    }) as VNode;
    detail.node.$children$ = [...(detail.node.$children$ || []), handle];
  };

  private readonly cancelForDataChange = () => this.cancel('data-change');

  private startResize(
    event: PointerEvent,
    rowType: DimensionRows,
    index: number,
  ) {
    if (
      !this.enabled ||
      this.active ||
      event.defaultPrevented ||
      !event.isPrimary ||
      (event.pointerType !== 'touch' && event.button !== 0)
    ) {
      return;
    }

    const dimension = this.providers.dimension.stores[rowType];
    const dimensionState = dimension.getCurrentState();
    const viewport = this.providers.viewport.stores[rowType];
    const item = getItemByIndex(dimensionState, index);
    const focusedStore = this.providers.selection.focusedStore;
    const selectedRowType = focusedStore
      ? this.providers.selection.storesYToType[focusedStore.position.y]
      : undefined;
    const indexes = getRowResizeIndexes({
      rowType,
      rowIndex: index,
      rowCount: dimensionState.count,
      selectedRange: this.providers.selection.selectedRange,
      selectedRowType,
    });
    if (!indexes.length) {
      return;
    }

    const previousSizes = indexes.reduce<ViewSettingSizeProp>(
      (sizes, rowIndex) => {
        const row = getItemByIndex(dimensionState, rowIndex);
        sizes[rowIndex] = row.end - row.start;
        return sizes;
      },
      {},
    );
    const startHeight = item.end - item.start;
    const active: ActiveResize = {
      pointerId: event.pointerId,
      rowType,
      index,
      indexes,
      startY: event.clientY,
      startHeight,
      currentHeight: startHeight,
      previousSizes,
      originalCustomSizes: { ...dimensionState.sizes },
      bottomAnchored:
        rowType === 'rgRow' &&
        this.isMainViewportAtBottom(viewport.lastCoordinate),
      lastEvent: event,
    };

    this.active = active;
    const beforeEvent = this.emit<RowResizeEventDetail>(
      BEFORE_ROW_RESIZE_EVENT,
      this.eventDetail(active, event, startHeight),
    );
    if (beforeEvent.defaultPrevented) {
      if (this.active === active) {
        this.active = undefined;
      }
      return;
    }
    if (!this.enabled || this.active !== active) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const doc = this.revogrid.ownerDocument;
    this.previousBodyCursor = doc.body?.style.cursor || '';
    if (doc.body) {
      doc.body.style.cursor = 'row-resize';
    }
    doc.addEventListener('pointermove', this.onPointerMove, true);
    doc.addEventListener('pointerup', this.onPointerUp, true);
    doc.addEventListener('pointercancel', this.onPointerCancel, true);
    doc.addEventListener('keydown', this.onKeyDown, true);
    doc.defaultView?.addEventListener('blur', this.onWindowBlur);
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const active = this.active;
    if (active?.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    active.lastEvent = event;
    this.pendingHeight = clampRowResizeHeight(
      active.startHeight + event.clientY - active.startY,
      this.config,
    );
    if (this.animationFrame === undefined) {
      const view = this.revogrid.ownerDocument.defaultView;
      this.animationFrame = view?.requestAnimationFrame(() => {
        this.animationFrame = undefined;
        this.flushPendingResize();
      });
    }
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const active = this.active;
    if (active?.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    active.lastEvent = event;
    this.pendingHeight = clampRowResizeHeight(
      active.startHeight + event.clientY - active.startY,
      this.config,
    );
    this.flushPendingResize();
    if (this.active !== active) {
      return;
    }
    const detail = this.eventDetail(active, event, active.currentHeight);
    this.finishGesture();
    this.commitResize(active);
    this.emit<RowResizeEventDetail>(AFTER_ROW_RESIZE_EVENT, detail);
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (this.active?.pointerId === event.pointerId) {
      this.active.lastEvent = event;
      this.cancel('pointercancel');
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.active) {
      event.preventDefault();
      this.cancel('escape');
    }
  };

  private readonly onWindowBlur = () => this.cancel('blur');

  private flushPendingResize() {
    const active = this.active;
    if (!active || this.pendingHeight === undefined) {
      return;
    }
    const size = this.pendingHeight;
    this.pendingHeight = undefined;
    if (size === active.currentHeight) {
      return;
    }
    this.providers.dimension.setCustomSizes(
      active.rowType,
      createRowResizePatch(active.indexes, size),
      true,
    );
    this.requestBottomAnchor(active);
    active.currentHeight = size;
    this.emit<RowResizeEventDetail>(
      ROW_RESIZE_EVENT,
      this.eventDetail(active, active.lastEvent, size),
    );
  }

  private cancel(reason: RowResizeCancelReason) {
    const active = this.active;
    if (!active) {
      return;
    }
    const currentSizes = {
      ...this.providers.dimension.stores[active.rowType].store.get('sizes'),
    };
    for (const index of active.indexes) {
      if (Object.hasOwn(active.originalCustomSizes, index)) {
        currentSizes[index] = active.originalCustomSizes[index];
      } else {
        delete currentSizes[index];
      }
    }
    this.providers.dimension.setCustomSizes(active.rowType, currentSizes);
    this.requestBottomAnchor(active);
    const detail = {
      ...this.eventDetail(
        active,
        active.lastEvent,
        active.startHeight,
      ),
      reason,
    };
    this.finishGesture();
    this.emit(ROW_RESIZE_CANCEL_EVENT, detail);
  }

  private eventDetail(
    active: ActiveResize,
    originalEvent: PointerEvent,
    size: number,
  ): RowResizeEventDetail {
    return {
      rowType: active.rowType,
      index: active.index,
      indexes: [...active.indexes],
      size,
      previousSizes: { ...active.previousSizes },
      originalEvent,
    };
  }

  private commitResize(active: ActiveResize) {
    if (active.currentHeight === active.startHeight) {
      return;
    }
    const items = this.providers.data.stores[active.rowType].store.get('items');
    const physicalIndexes = active.indexes.reduce<number[]>((result, index) => {
      const physicalIndex = items[index];
      if (physicalIndex !== undefined) {
        result.push(physicalIndex);
      }
      return result;
    }, []);
    if (physicalIndexes.length) {
      const rowDefinitions = mergeRowResizeDefinitions(
        this.providers.dimension.getRowDefinitions(),
        active.rowType,
        physicalIndexes,
        active.currentHeight,
      );
      this.providers.dimension.setRowDefinitions(rowDefinitions);
      this.scheduleRowDefinitionRemap();
      this.keepBottomAnchor = active.bottomAnchored;
      this.requestBottomAnchor(active);
    }
  }

  private requestBottomAnchor(active: ActiveResize) {
    if (active.bottomAnchored) {
      this.pendingBottomAnchor = true;
    }
  }

  private isMainViewportAtBottom(coordinate: number) {
    const dimension = this.providers.dimension.stores.rgRow.getCurrentState();
    const viewport = this.providers.viewport.stores.rgRow.store.state;
    return (
      dimension.realSize > viewport.clientSize &&
      coordinate >= getViewportMaxCoordinate(dimension, viewport.virtualSize)
    );
  }

  private readonly updateBottomAnchorState = ({
    detail,
  }: CustomEvent<ViewPortScrollEvent>) => {
    if (detail.dimension !== 'rgRow') {
      return;
    }
    this.keepBottomAnchor = this.isMainViewportAtBottom(detail.coordinate);
  };

  private readonly applyPendingBottomAnchor = () => {
    if (!this.pendingBottomAnchor) {
      return;
    }
    this.pendingBottomAnchor = false;
    const dimension = this.providers.dimension.stores.rgRow.store;
    // Scroll surfaces have slightly different client sizes. Give the shared
    // scrolling service the content end and let each surface clamp to its own
    // exact bottom coordinate.
    void this.revogrid.scrollToCoordinate({ y: dimension.get('realSize') });
  };

  private readonly scheduleRowDefinitionRemap = () => {
    if (this.rowDefinitionRemapQueued) {
      return;
    }
    this.rowDefinitionRemapQueued = true;
    queueMicrotask(() => {
      if (!this.rowDefinitionRemapQueued) {
        return;
      }
      this.pruneRowDefinitions();
      this.reapplyRowDefinitionSizes();
      this.rowDefinitionRemapQueued = false;
    });
  };

  private pruneRowDefinitions() {
    if (!this.pendingSourceCounts.size) {
      return;
    }
    const definitions = this.providers.dimension.getRowDefinitions();
    const rowDefinitions = definitions.filter(definition => {
      const count = this.pendingSourceCounts.get(definition.type);
      return count === undefined || definition.index < count;
    });
    this.pendingSourceCounts.clear();
    if (rowDefinitions.length !== definitions.length) {
      this.providers.dimension.setRowDefinitions(rowDefinitions);
    }
  }

  /** Map source-indexed row definitions back onto the current virtual order. */
  private readonly reapplyRowDefinitionSizes = () => {
    const rowDefinitions = this.providers.dimension.getRowDefinitions();
    for (const rowType of rowTypes) {
      const items = this.providers.data.stores[rowType].store.get('items');
      const definitions = new Map(
        rowDefinitions
          .filter(definition => definition.type === rowType)
          .map(definition => [definition.index, definition.size]),
      );
      const appliedIndexes = this.appliedDefinitionIndexes.get(rowType);
      if (!definitions.size && !appliedIndexes?.size) {
        continue;
      }
      const dimension = this.providers.dimension.stores[rowType];
      const currentSizes = dimension.store.get('sizes');
      const sizes: ViewSettingSizeProp = { ...currentSizes };
      for (const index of appliedIndexes || []) {
        delete sizes[index];
      }
      const indexes = new Set<number>();
      items.forEach((physicalIndex, virtualIndex) => {
        const size = definitions.get(physicalIndex);
        if (size !== undefined) {
          sizes[virtualIndex] = size;
          indexes.add(virtualIndex);
        }
      });
      this.appliedDefinitionIndexes.set(rowType, indexes);
      const sizeKeys = Object.keys(sizes);
      if (
        sizeKeys.length !== Object.keys(currentSizes).length ||
        sizeKeys.some(index => sizes[index] !== currentSizes[index])
      ) {
        this.providers.dimension.setCustomSizes(rowType, sizes);
      }
    }
  };

  private finishGesture() {
    const doc = this.revogrid.ownerDocument;
    const view = doc.defaultView;
    if (this.animationFrame !== undefined) {
      view?.cancelAnimationFrame(this.animationFrame);
    }
    doc.removeEventListener('pointermove', this.onPointerMove, true);
    doc.removeEventListener('pointerup', this.onPointerUp, true);
    doc.removeEventListener('pointercancel', this.onPointerCancel, true);
    doc.removeEventListener('keydown', this.onKeyDown, true);
    view?.removeEventListener('blur', this.onWindowBlur);
    if (doc.body) {
      doc.body.style.cursor = this.previousBodyCursor;
    }
    this.animationFrame = undefined;
    this.pendingHeight = undefined;
    this.active = undefined;
  }

  destroy() {
    this.cancel('destroy');
    this.keepBottomAnchor = false;
    this.rowDefinitionRemapQueued = false;
    this.pendingSourceCounts.clear();
    super.destroy();
  }
}
