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
import { GROUP_EXPAND_EVENT } from '../groupingRow/grouping.const';
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
  startEvent: PointerEvent;
  lastEvent: PointerEvent;
};

export class RowResizePlugin extends BasePlugin {
  private config: ResolvedRowResizeConfig;
  private enabled = false;

  private active?: ActiveResize;
  private readonly committedSizes = new Map<
    DimensionRows,
    Map<number, number>
  >();
  private readonly appliedIndexes = new Map<DimensionRows, Set<number>>();
  private animationFrame?: number;
  private pendingHeight?: number;
  private pendingBottomAnchor = false;
  private keepBottomAnchor = false;
  private rowDefinitionRemapQueued = false;
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
    } else {
      this.syncGridConfig(false);
    }
  }

  private registerEventListeners() {
    this.addEventListener('beforerowrender', this.decorateRow);
    this.addEventListener('beforeanysource', ({ detail }) => {
      this.cancel('data-change');
      this.keepBottomAnchor = false;
      const committed = this.committedSizes.get(detail.type);
      if (!committed) {
        return;
      }
      const removedIndexes = new Set<number>();
      for (const index of committed.keys()) {
        if (index >= detail.source.length) {
          committed.delete(index);
          removedIndexes.add(index);
        }
      }
      if (removedIndexes.size) {
        const rowDefinitions = this.providers.dimension
          .getRowDefinitions()
          .filter(
            definition =>
              definition.type !== detail.type ||
              !removedIndexes.has(definition.index),
          );
        this.providers.dimension.setRowDefinitions(rowDefinitions);
      }
    });
    this.addEventListener('afteranysource', this.rebuildCommittedSizes);
    this.addEventListener('beforesourcesortingapply', this.cancelForDataChange);
    this.addEventListener('aftersortingapply', this.reapplyCommittedSizes);
    this.addEventListener('beforefilterapply', this.cancelForDataChange);
    this.addEventListener('afterfilterapply', this.scheduleRowDefinitionRemap);
    this.addEventListener('beforerowdefinition', ({ detail }) => {
      this.cancel('data-change');
      if (detail.vals !== this.providers.dimension.getRowDefinitions()) {
        this.committedSizes.clear();
      }
      this.scheduleRowDefinitionRemap();
    });
    this.addEventListener('afterthemechanged', this.reapplyCommittedSizes);
    this.addEventListener('aftertrimmed', this.scheduleRowDefinitionRemap);
    this.addEventListener('roworderchange', () => {
      queueMicrotask(this.reapplyCommittedSizes);
    });
    this.addEventListener(GROUP_EXPAND_EVENT, () => {
      if (this.keepBottomAnchor) {
        this.pendingBottomAnchor = true;
      }
      queueMicrotask(this.reapplyCommittedSizes);
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
    const { resizeRow } = this.revogrid;
    const hasConfiguredPlugin = this.providers.plugins
      .get()
      .some(plugin => plugin !== this && plugin instanceof RowResizePlugin);
    const enabled =
      this.constructor !== RowResizePlugin ||
      (!hasConfiguredPlugin && !!resizeRow);
    const config = resolveRowResizeConfig(
      typeof resizeRow === 'object' ? resizeRow : undefined,
    );
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
    const viewportState = viewport.store.state;
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
        dimensionState.realSize > viewportState.clientSize &&
        viewport.lastCoordinate >=
          getViewportMaxCoordinate(dimensionState, viewportState.virtualSize),
      startEvent: event,
      lastEvent: event,
    };

    const beforeEvent = this.emit<RowResizeEventDetail>(
      BEFORE_ROW_RESIZE_EVENT,
      this.eventDetail(active, event, startHeight),
    );
    if (beforeEvent.defaultPrevented) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.active = active;
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
        active.lastEvent || active.startEvent,
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
    let committed = this.committedSizes.get(active.rowType);
    if (!committed) {
      committed = new Map();
      this.committedSizes.set(active.rowType, committed);
    }
    let applied = this.appliedIndexes.get(active.rowType);
    if (!applied) {
      applied = new Set();
      this.appliedIndexes.set(active.rowType, applied);
    }
    const physicalIndexes = active.indexes.reduce<number[]>((result, index) => {
      const physicalIndex = items[index];
      if (physicalIndex !== undefined) {
        committed.set(physicalIndex, active.currentHeight);
        applied.add(index);
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
      this.keepBottomAnchor = active.bottomAnchored;
      this.requestBottomAnchor(active);
    }
  }

  private requestBottomAnchor(active: ActiveResize) {
    if (active.bottomAnchored) {
      this.pendingBottomAnchor = true;
    }
  }

  private readonly updateBottomAnchorState = ({
    detail,
  }: CustomEvent<ViewPortScrollEvent>) => {
    if (detail.dimension !== 'rgRow') {
      return;
    }
    const dimension = this.providers.dimension.stores.rgRow.store;
    const viewport = this.providers.viewport.stores.rgRow.store;
    const realSize = dimension.get('realSize');
    const clientSize = viewport.get('clientSize');
    this.keepBottomAnchor =
      realSize > clientSize &&
      detail.coordinate >=
        realSize - clientSize - dimension.get('originItemSize');
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

  private readonly reapplyCommittedSizes = () =>
    this.applyCommittedSizes(false);

  private readonly rebuildCommittedSizes = () => {
    this.applyCommittedSizes(true);
    this.scheduleRowDefinitionRemap();
  };

  private applyCommittedSizes(clearAppliedIndexes: boolean) {
    for (const [rowType, committed] of this.committedSizes) {
      const dimension = this.providers.dimension.stores[rowType];
      const sizes = { ...dimension.store.get('sizes') };
      if (clearAppliedIndexes) {
        for (const index of this.appliedIndexes.get(rowType) || []) {
          delete sizes[index];
        }
      }
      const items = this.providers.data.stores[rowType].store.get('items');
      const indexes = new Set<number>();
      items.forEach((physicalIndex, virtualIndex) => {
        const size = committed.get(physicalIndex);
        if (size !== undefined) {
          sizes[virtualIndex] = size;
          indexes.add(virtualIndex);
        }
      });
      this.appliedIndexes.set(rowType, indexes);
      this.providers.dimension.setCustomSizes(rowType, sizes);
    }
  }

  private readonly scheduleRowDefinitionRemap = () => {
    if (this.rowDefinitionRemapQueued) {
      return;
    }
    this.rowDefinitionRemapQueued = true;
    queueMicrotask(() => {
      if (!this.rowDefinitionRemapQueued) {
        return;
      }
      this.rowDefinitionRemapQueued = false;
      this.reapplyRowDefinitionSizes();
    });
  };

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
      const appliedIndexes = this.appliedIndexes.get(rowType);
      if (!definitions.size && !appliedIndexes?.size) {
        continue;
      }
      const dimension = this.providers.dimension.stores[rowType];
      const currentSizes = dimension.store.get('sizes');
      const sizes: ViewSettingSizeProp = { ...currentSizes };
      for (const index of appliedIndexes || []) {
        delete sizes[index];
      }
      for (const physicalIndex of definitions.keys()) {
        delete sizes[physicalIndex];
      }
      const indexes = new Set<number>();
      items.forEach((physicalIndex, virtualIndex) => {
        const size = definitions.get(physicalIndex);
        if (size !== undefined) {
          sizes[virtualIndex] = size;
          indexes.add(virtualIndex);
        }
      });
      this.appliedIndexes.set(rowType, indexes);
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
    super.destroy();
  }
}
