import './row-master.style.css';
import {
  BasePlugin,
  dispatch,
  h,
  rowTypes,
  REVOGRID_EVENTS,
  type CellTemplateProp,
  type DimensionRows,
  type PluginProviders,
  type FocusRenderEvent,
  type VirtualPositionItem,
} from '@revolist/revogrid';
import debounce from 'lodash/debounce';
import type { RowMasterConfig } from './row-master.types';
import {
  AFTER_GRID_RENDER_EVENT,
  AFTER_SOURCE_EVENT,
  APPLY_RANGE_EVENT,
  BEFORE_CELL_RENDER_EVENT,
  BEFORE_ROW_RENDER_EVENT,
  EDIT_RENDER_EVENT,
  EVENT_ROW_FOCUS_SIMPLE,
  FOCUS_APPLY_EVENT,
  OVERLAY_CLEAR_NODES,
  OVERLAY_NODE,
  ROW_MASTER,
} from '../events';
import * as CUSTOM_EVENTS from '../events';
import { addAndShift, directAncestor, removeMultipleAndShift } from '../utils';
export { EXPAND_COLUMN } from './cell-expand.template'
/**
 * Plugin for Row Master
 * Serves for managing master rows in a grid component.
 */
export class MasterRowPlugin extends BasePlugin {
  private unsubscribe: (() => void)[] = [];
  private readonly config: Partial<RowMasterConfig>;
  // Store expanded master rows
  private expandedMasters = new Set<string>(); // {rowType:physicalIndex}

  constructor(
    revogrid: HTMLRevoGridElement,
    public providers: PluginProviders,
  ) {
    super(revogrid, providers);

    this.config = revogrid.additionalData?.masterRow || {};
    let scrollableViewportEl: HTMLElement | null = null;

    this.addEventListener(AFTER_GRID_RENDER_EVENT, () => {
      scrollableViewportEl = directAncestor(
        revogrid,
        '.main-viewport > .viewports > .rgCol',
      );
    });


    const verifyRowStillExpanded = debounce(
      (vpItems: VirtualPositionItem[], type: DimensionRows) => {
        if (!this.expandedMasters.size) {
          return;
        }
        const dataStoreItems = providers.data.stores[type].store.get('items');
        const overlayDetails: HTMLRevoGridElementEventMap['overlayclearnode'] =
          {
            nodeIds: [],
          };

        // Check if row is still expanded in the viewport
        // We need to check if we have 2 rows with the same index
        const doubled = vpItems.reduce((physIndexToVirtual, item) => {
          const virtualIndex = item.itemIndex;
          const physIndex = dataStoreItems[virtualIndex];
          // Index will be always the first item we have 2 coupled with same index
          if (dataStoreItems[virtualIndex - 1] === physIndex) {
            physIndexToVirtual.add(physIndex);
          }
          return physIndexToVirtual;
        }, new Set<number>());

        // Check if row is still expanded in the source
        this.expandedMasters.forEach((_, k) => {
          const [rowType, expandedPhysRowIndex] = k.split(':');
          if (rowType === type) {
            const prevPhysRowIndex = parseInt(expandedPhysRowIndex, 10);
            const expanded = doubled.has(prevPhysRowIndex);
            if (!expanded) {
              // Row is no longer expanded, probably it's filtered or trimmed
              overlayDetails.nodeIds.push(k);
            }
          }
        });
        // Clear overlay and refresh dimension
        if (overlayDetails.nodeIds.length) {
          dispatch(revogrid, OVERLAY_CLEAR_NODES, overlayDetails);
        }
      },
      10,
    );

    // subscribe to data changes and verify if row is still expanded
    rowTypes.forEach((type) => {
      // const dataStore = providers.data.stores[type].store;
      const unsubscribe = providers.viewport.stores[type].store.onChange(
        'items',
        (v) => {
          verifyRowStillExpanded(v, type);
        },
      );

      this.unsubscribe.push(unsubscribe);
    });

    this.addEventListener(
      ROW_MASTER,
      ({ detail }: CustomEvent<CellTemplateProp>) => {
        const dataStore = providers.data.stores[detail.type].store;
        const virtRowIndex = detail.rowIndex;
        const physRowIndex = dataStore.get('items')[virtRowIndex];
        const rowId = `${detail.type}:${physRowIndex}`;

        // Collapse row
        if (this.expandedMasters.has(rowId)) {
          this.collapseRow(detail.type, [virtRowIndex]);
          // Expand row
        } else {
          this.expandRow(detail.type, virtRowIndex);
        }
      },
    );

    // Listen for RV events and stop propagation
    const RV_EVENTS = [...REVOGRID_EVENTS.values(), ...Object.values(CUSTOM_EVENTS)].reduce(
      (res: Record<string, (e: Event) => void>, e) => {
        res[`on${e.charAt(0).toUpperCase() + e.slice(1)}`] = (
          e: Event,
        ) => {
          e.stopPropagation();
        };
        return res;
      },
      {},
    );

    this.addEventListener(
      BEFORE_ROW_RENDER_EVENT,
      (e: CustomEvent<HTMLRevogrDataElementEventMap['beforerowrender']>) => {
        const dataStore = providers.data.stores[e.detail.rowType].store;
        const items = dataStore.get('items');

        // if this is master row and it's expanded
        if (
          this.isMasterRowExpanded(
            items,
            e.detail.rowType,
            e.detail.item.itemIndex,
          )
        ) {
          if (e.detail.node.$attrs$) {
            e.detail.node.$attrs$.expanded = true;
          }
          return;
        }

        // Render master row details
        const nodeId = this.isExpandedRow(
          items,
          e.detail.rowType,
          e.detail.item.itemIndex,
        );
        if (!nodeId) {
          return;
        }
        const physIndex = parseInt(nodeId.split(':')[1]);
        const model = dataStore.get('source')[physIndex];
        const newVnode = this.config.template?.(
          h,
          {
            ...e.detail,
            model,
          },
          {},
        );
        if (!newVnode) {
          return;
        }

        const wrapper = h(
          'div',
          {
            class: { 'revo-master-row': true },
            key: nodeId,
            style: {
              height: `${e.detail.item.size}px`,
              transform: `translateY(${e.detail.item.start}px)`,
            },
            ...RV_EVENTS,

            // Handle mouse wheel
            onWheel(e: WheelEvent) {
              if (e.defaultPrevented) {
                return;
              }
              dispatch(scrollableViewportEl,'mousewheel-vertical', e);
              e.preventDefault();
            },
          },
          newVnode,
        );
        const detail: HTMLRevoGridElementEventMap['overlaynode'] = {
          nodeId,
          vnode: wrapper,
        };
        dispatch(revogrid, OVERLAY_NODE, detail);
      },
    );

    this.addEventListener(
      BEFORE_CELL_RENDER_EVENT,
      (e: CustomEvent<HTMLRevogrDataElementEventMap['beforecellrender']>) => {
        if (
          this.isExpandedRow(
            this.providers.data.stores[e.detail.rowType].store.get('items'),
            e.detail.rowType,
            e.detail.row.itemIndex,
          )
        ) {
          e.preventDefault();
        }
      },
    );

    this.addEventListener(AFTER_SOURCE_EVENT, () => {
      // Clear overlay
      const details: HTMLRevoGridElementEventMap['overlayclearnode'] = {
        nodeIds: [...this.expandedMasters.keys()],
      };
      this.expandedMasters.clear();
      dispatch(revogrid, OVERLAY_CLEAR_NODES, details);
    });

    this.addEventListener(
      APPLY_RANGE_EVENT,
      (
        e: CustomEvent<
          HTMLRevogrOverlaySelectionElementEventMap['beforeapplyrange']
        >,
      ) => this.focusRender(e),
    );
    this.addEventListener(
      FOCUS_APPLY_EVENT,
      (
        e: CustomEvent<HTMLRevogrOverlaySelectionElementEventMap['applyfocus']>,
      ) => this.focusRender(e),
    );
    this.addEventListener(
      EDIT_RENDER_EVENT,
      (
        e: CustomEvent<
          HTMLRevogrOverlaySelectionElementEventMap['beforeeditrender']
        >,
      ) => this.focusRender(e),
    );
  }

  /**
   * Overrides focus range based on hidden and merged values
   */
  private focusRender(e: CustomEvent<FocusRenderEvent>) {
    const detail = e.detail;
    if (
      detail.range.y === detail.range.y1 &&
      this.isExpandedRow(
        this.providers.data.stores[e.detail.rowType].store.get('items'),
        detail.rowType,
        detail.range.y,
      )
    ) {
      e.preventDefault();
      dispatch(this.revogrid, EVENT_ROW_FOCUS_SIMPLE, {
        rowType: detail.rowType,
        rowIndex: detail.range.y,
      });
    }
  }

  isMasterRowExpanded(
    itemVIndexes: number[],
    rowType: DimensionRows,
    virtualRowIndex: number,
  ) {
    const physRowIndex = itemVIndexes[virtualRowIndex];
    // Get previous physical index
    const nextPhysRowIndex = itemVIndexes[virtualRowIndex + 1];
    return this.getExpandedId(rowType, physRowIndex, nextPhysRowIndex);
  }

  isExpandedRow(
    itemVIndexes: number[],
    rowType: DimensionRows,
    virtualRowIndex: number,
  ) {
    const physRowIndex = itemVIndexes[virtualRowIndex];
    // Get previous physical index
    const prevPhysRowIndex = itemVIndexes[virtualRowIndex - 1];
    return this.getExpandedId(rowType, physRowIndex, prevPhysRowIndex);
  }

  /**
   * This method checks if a row is expanded by verifying two conditions:
   * 1. The row's ID (nodeId) is present in the expandedMasters collection.
   * 2. The physical row index (physRowIndex) is the same as the neighoring physical row index (sibPhysRowIndex).
   */
  getExpandedId(
    rowType: DimensionRows,
    physRowIndex: number,
    sibPhysRowIndex: number,
  ) {
    const nodeId = `${rowType}:${physRowIndex}`;
    // Check if row is expanded, it comes from the same physical index
    if (this.expandedMasters.has(nodeId) && physRowIndex === sibPhysRowIndex) {
      return nodeId;
    }
    return null;
  }

  clearDimensions(type: DimensionRows, rowIndexes: number[]) {
    if (this.config.rowHeight) {
      const dimensionStore = this.providers.dimension.stores[type].store;
      const sizes = removeMultipleAndShift(
        dimensionStore.get('sizes'),
        rowIndexes.reduce((acc, v) => {
          acc.add(v + 1);
          return acc;
        }, new Set<number>()),
      );
      this.providers.dimension.setCustomSizes(type, sizes);
    }
  }

  collapseRow(type: DimensionRows, rowIndexes: number[]) {
    const dataService = this.providers.data.stores[type];
    const dataStore = dataService.store;
    let items = [...dataStore.get('items')];

    const overlayDetails: HTMLRevoGridElementEventMap['overlayclearnode'] = {
      nodeIds: [],
    };
    rowIndexes.forEach((virtRowIndex) => {
      const physRowIndex = items[virtRowIndex];
      const rowId = `${type}:${physRowIndex}`;
      this.expandedMasters.delete(rowId);
      overlayDetails.nodeIds.push(rowId);
    });
    items = items.filter((_, i) => !rowIndexes.includes(i - 1));
    // Clear overlay
    dispatch(this.revogrid, OVERLAY_CLEAR_NODES, overlayDetails);

    dataService.setData({ items, proxyItems: items });

    this.clearDimensions(type, rowIndexes);
    this.providers.dimension.setData(items.length, type);
  }

  expandRow(type: DimensionRows, virtRowIndex: number) {
    const dataService = this.providers.data.stores[type];
    const items = [...dataService.store.get('items')];
    const physIndex = items[virtRowIndex];
    const rowId = `${type}:${physIndex}`;
    this.expandedMasters.add(rowId);
    // insert new row
    items.splice(virtRowIndex + 1, 0, physIndex);
    dataService.setData({ items, proxyItems: items });

    if (this.config.rowHeight) {
      let sizes = this.providers.dimension.stores[type].store.get('sizes');
      // insert new row and shift other indexes
      sizes = addAndShift(sizes, virtRowIndex + 1, this.config.rowHeight);
      this.providers.dimension.setCustomSizes(type, sizes);
    }
    this.providers.dimension.setData(items.length, type);
  }

  destroy() {
    this.unsubscribe.forEach((u) => u());
    super.destroy();
  }
}
