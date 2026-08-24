import type { VNode } from '@stencil/core';
import { getItemByIndex } from '@store';
import type {
  BeforeRowRenderEvent,
  DimensionRows,
  PluginProviders,
  ViewSettingSizeProp,
} from '@type';
import { BasePlugin, type GridPlugin } from '../base.plugin';
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
  startEvent: PointerEvent;
  lastEvent: PointerEvent;
};

export class RowResizePlugin extends BasePlugin {
  private config: ResolvedRowResizeConfig;
  private enabled = true;
  private gridResizeRow: HTMLRevoGridElement['resizeRow'] = false;
  private gridPlugins: GridPlugin[] = [];

  private active?: ActiveResize;
  private readonly committedSizes = new Map<
    DimensionRows,
    Map<number, number>
  >();
  private readonly appliedIndexes = new Map<DimensionRows, Set<number>>();
  private animationFrame?: number;
  private pendingHeight?: number;
  private previousBodyCursor = '';
  private rowDefinitionsRef: HTMLRevoGridElement['rowDefinitions'];

  static fromGridProperty(
    revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
  ): RowResizePlugin {
    const plugin = new RowResizePlugin(revogrid, providers);
    plugin.controlFromGridProperty();
    return plugin;
  }

  constructor(
    revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
    config: RowResizeConfig = {},
  ) {
    super(revogrid, providers);
    this.config = resolveRowResizeConfig(config);
    this.rowDefinitionsRef = revogrid.rowDefinitions;
    this.registerEventListeners();
  }

  private registerEventListeners() {
    this.addEventListener('beforerowrender', this.decorateRow);
    this.addEventListener('beforeanysource', ({ detail }) => {
      this.cancel('data-change');
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
        const rowDefinitions = this.revogrid.rowDefinitions.filter(
          definition =>
            definition.type !== detail.type ||
            !removedIndexes.has(definition.index),
        );
        this.rowDefinitionsRef = rowDefinitions;
        this.revogrid.rowDefinitions = rowDefinitions;
      }
    });
    this.addEventListener('afteranysource', this.rebuildCommittedSizes);
    this.addEventListener('beforesourcesortingapply', this.cancelForDataChange);
    this.addEventListener('aftersortingapply', this.reapplyCommittedSizes);
    this.addEventListener('beforefilterapply', this.cancelForDataChange);
    this.addEventListener('beforerowdefinition', ({ detail }) => {
      this.cancel('data-change');
      if (detail.vals !== this.rowDefinitionsRef) {
        this.committedSizes.clear();
        this.appliedIndexes.clear();
        this.rowDefinitionsRef = detail.vals;
      }
    });
    this.addEventListener('afterthemechanged', this.reapplyCommittedSizes);
    this.addEventListener('aftertrimmed', this.syncAppliedIndexes);
    this.addEventListener('roworderchange', () => {
      queueMicrotask(this.reapplyCommittedSizes);
    });
    this.addEventListener(GROUP_EXPAND_EVENT, () => {
      queueMicrotask(this.reapplyCommittedSizes);
    });
    this.addEventListener('rowheaderschanged', ({ detail }) => {
      if (!detail && !this.config.fullRow) {
        this.cancel('row-headers-hidden');
      }
    });
  }

  private controlFromGridProperty() {
    this.gridResizeRow = this.revogrid.resizeRow;
    this.gridPlugins = this.revogrid.plugins;
    this.syncGridProperty(false);
    this.watch<HTMLRevoGridElement['resizeRow']>('resizeRow', value => {
      this.gridResizeRow = value;
      this.syncGridProperty();
    });
    this.watch<GridPlugin[]>('plugins', value => {
      this.gridPlugins = value || [];
      this.syncGridProperty();
    });
  }

  private syncGridProperty(refresh = true) {
    const configuredPlugin = this.gridPlugins.find(
      plugin =>
        plugin !== RowResizePlugin &&
        plugin.prototype instanceof RowResizePlugin,
    );
    const explicitlyEnabled = this.gridPlugins.includes(RowResizePlugin);
    const enabled = configuredPlugin
      ? false
      : explicitlyEnabled || !!this.gridResizeRow;
    const config = resolveRowResizeConfig(
      !configuredPlugin &&
        !explicitlyEnabled &&
        typeof this.gridResizeRow === 'object'
        ? this.gridResizeRow
        : undefined,
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
        this.rowDefinitionsRef = this.revogrid.rowDefinitions;
        this.registerEventListeners();
      } else {
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
        this.revogrid.rowDefinitions,
        active.rowType,
        physicalIndexes,
        active.currentHeight,
      );
      this.rowDefinitionsRef = rowDefinitions;
      this.revogrid.rowDefinitions = rowDefinitions;
    }
  }

  private readonly reapplyCommittedSizes = () => {
    for (const [rowType, committed] of this.committedSizes) {
      const dimension = this.providers.dimension.stores[rowType];
      const sizes = { ...dimension.store.get('sizes') };
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
  };

  private readonly rebuildCommittedSizes = () => {
    for (const [rowType, committed] of this.committedSizes) {
      const dimension = this.providers.dimension.stores[rowType];
      const sizes = { ...dimension.store.get('sizes') };
      for (const index of this.appliedIndexes.get(rowType) || []) {
        delete sizes[index];
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
  };

  private readonly syncAppliedIndexes = () => {
    for (const [rowType, committed] of this.committedSizes) {
      const items = this.providers.data.stores[rowType].store.get('items');
      const indexes = new Set<number>();
      items.forEach((physicalIndex, virtualIndex) => {
        if (committed.has(physicalIndex)) {
          indexes.add(virtualIndex);
        }
      });
      this.appliedIndexes.set(rowType, indexes);
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
    super.destroy();
  }
}

export function createRowResizePlugin(
  config: RowResizeConfig = {},
): GridPlugin {
  return class ConfiguredRowResizePlugin extends RowResizePlugin {
    constructor(revogrid: HTMLRevoGridElement, providers: PluginProviders) {
      super(revogrid, providers, config);
    }
  };
}
