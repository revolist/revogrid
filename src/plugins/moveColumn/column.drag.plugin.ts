/**
 * Plugin for column manual move
 */
import debounce from 'lodash/debounce';
import each from 'lodash/each';
import { getItemByPosition } from '@store';
import { BasePlugin } from '../base.plugin';
import { ColumnOrderHandler } from './order-column.handler';
import { dispatch } from '../dispatcher';
import type {
  ColumnPropProp,
  ColumnRegular,
  DimensionSettingsState,
  PositionItem,
  DimensionCols,
  MultiDimensionType,
  PluginProviders,
  DimensionColPin,
} from '@type';
import { ON_COLUMN_CLICK } from '../../components/header/header-cell-renderer';
import { isColGrouping } from '../../utils/column.utils';

const COLUMN_CLICK = ON_COLUMN_CLICK;
export const COLUMN_DRAG_MOVE_EVENT = 'columndragmousemove';
export const COLUMN_DRAG_END_EVENT = 'columndragend';
export const BEFORE_COLUMN_DRAG_END_EVENT = 'beforecolumndragend';

// use this event subscription to drop D&D for particular columns
export const COLUMN_DRAG_START_EVENT = 'columndragstart';

export type DragStartEventDetails = {
  event: MouseEvent;
  data: ColumnPropProp;
};

export type ColumnDragStartEventData = ColumnPropProp;

export type StaticData = {
  startPos: number;
  startItem: PositionItem;
  pin?: DimensionColPin;
  dataEl: HTMLElement;
  scrollEl: Element;
  gridEl: HTMLElement;
  cols: DimensionSettingsState;
};

type LocalSubscriptions = Record<string, LocalSubscription>;
type LocalSubscription = {
  target: Element | Document;
  callback(...params: any[]): void;
};
export type ColumnDragEventData = {
  /**
   * Reordered columns for the affected column viewport.
   */
  columns: ColumnRegular[];
  elRect: DOMRect;
  gridRect: DOMRect;
  /**
   * Physical column indexes in their current visual order.
   */
  order: number[];
  scrollOffset: number;
  type: DimensionCols;
};

export type BeforeColumnDragEndEventData = StaticData & {
  startPosition: PositionItem;
  newPosition: PositionItem;
  newItem?: ColumnRegular;
};

declare global {
  interface HTMLRevoGridElementEventMap {
    [COLUMN_DRAG_START_EVENT]: ColumnDragStartEventData;
    [COLUMN_DRAG_MOVE_EVENT]: MouseEvent;
    [BEFORE_COLUMN_DRAG_END_EVENT]: BeforeColumnDragEndEventData;
    [COLUMN_DRAG_END_EVENT]: ColumnDragEventData;
  }
}

export class ColumnMovePlugin extends BasePlugin {
  protected moveFunc = debounce((e: MouseEvent) => this.doMove(e), 5);
  protected staticDragData: StaticData | null = null;
  protected dragData: ColumnDragEventData | null = null;
  readonly orderUi: ColumnOrderHandler;
  readonly localSubscriptions: LocalSubscriptions = {};

  constructor(revogrid: HTMLRevoGridElement, providers: PluginProviders) {
    super(revogrid, providers);
    this.orderUi = new ColumnOrderHandler();
    revogrid.appendChild(this.orderUi.render());
    revogrid.classList.add('column-draggable');

    // Register events
    this.localSubscriptions['mouseleave'] = {
      target: document,
      callback: (e: MouseEvent) => this.onMouseOut(e),
    };
    this.localSubscriptions['mouseup'] = {
      target: document,
      callback: (e: MouseEvent) => this.onMouseUp(e),
    };

    this.localSubscriptions['mousemove'] = {
      target: document,
      callback: (e: MouseEvent) => this.move(e),
    };

    this.addEventListener(COLUMN_CLICK, ({ detail }) => this.dragStart(detail));
  }

  dragStart({ event, data }: DragStartEventDetails) {
    if (event.defaultPrevented) {
      return;
    }
    const { defaultPrevented } = dispatch(
      this.revogrid,
      COLUMN_DRAG_START_EVENT,
      data,
    );
    // check if allowed to drag particulat column
    if (defaultPrevented) {
      return;
    }
    this.clearOrder();
    const { mouseleave, mouseup, mousemove } = this.localSubscriptions;
    mouseleave.target.addEventListener('mouseleave', mouseleave.callback);
    mouseup.target.addEventListener('mouseup', mouseup.callback);

    const dataEl = (event.target as HTMLElement).closest('revogr-header');
    const scrollEl = (event.target as HTMLElement).closest(
      'revogr-viewport-scroll',
    );
    if (!dataEl || !scrollEl) {
      return;
    }

    // no grouping drag and no row header column drag
    if (isColGrouping(data) || data.providers.type === 'rowHeaders') {
      return;
    }

    const cols = this.getDimension(data.pin || 'rgCol');
    const gridRect = this.revogrid.getBoundingClientRect();
    const elRect = dataEl.getBoundingClientRect();
    const startItem = getItemByPosition(
      cols,
      getLeftRelative(event.x, gridRect.left, elRect.left - gridRect.left) +
        (cols.renderOffset || 0),
    );

    this.staticDragData = {
      startPos: event.x,
      startItem,
      pin: data.pin,
      dataEl,
      scrollEl,
      gridEl: this.revogrid,
      cols,
    };
    this.dragData = this.getData(this.staticDragData, []);
    mousemove.target.addEventListener('mousemove', mousemove.callback);
    this.orderUi.start(event, {
      ...this.dragData,
      ...this.staticDragData,
    });
  }

  doMove(e: MouseEvent) {
    if (!this.staticDragData) {
      return;
    }

    const dragData = (this.dragData = this.getData(this.staticDragData, []));
    if (!dragData) {
      return;
    }
    const start = this.staticDragData.startPos;
    if (Math.abs(start - e.x) > 10) {
      const x = getLeftRelative(
        e.x,
        this.dragData.gridRect.left,
        this.dragData.scrollOffset,
      );
      const rgCol = getItemByPosition(
        this.staticDragData.cols,
        x + (this.staticDragData.cols.renderOffset || 0),
      );
      this.orderUi.autoscroll(x, dragData.elRect.width);

      // prevent position change if out of bounds
      if (rgCol.itemIndex >= this.staticDragData.cols.count) {
        return;
      }
      this.orderUi.showHandler(
        getColumnDragPosition(
          rgCol,
          this.staticDragData.startItem,
          this.staticDragData.cols.renderOffset || 0,
          dragData.scrollOffset,
        ),
        dragData.gridRect.width,
      );
    }
  }

  move(e: MouseEvent) {
    dispatch(this.revogrid, COLUMN_DRAG_MOVE_EVENT, e);
    // then do move
    this.moveFunc(e);
  }
  onMouseOut(_: MouseEvent) {
    this.clearOrder();
  }
  onMouseUp(e: MouseEvent) {
    // apply new positions
    if (this.dragData && this.staticDragData) {
      let relativePos = getLeftRelative(
        e.x,
        this.dragData.gridRect.left,
        this.dragData.scrollOffset,
      );
      if (relativePos < 0) {
        relativePos = 0;
      }
      const newPosition = getItemByPosition(
        this.staticDragData.cols,
        relativePos + (this.staticDragData.cols.renderOffset || 0),
      );

      const store = this.providers.column.stores[this.dragData.type].store;
      const source = store.get('source');
      const newItems = [...store.get('items')];

      // prevent position change if needed
      const { defaultPrevented: stopDrag } =
        dispatch<BeforeColumnDragEndEventData>(
          this.revogrid,
          BEFORE_COLUMN_DRAG_END_EVENT,
          {
            ...this.staticDragData,
            startPosition: this.staticDragData.startItem,
            newPosition,
            newItem: source[newItems[this.staticDragData.startItem.itemIndex]],
          },
        );
      if (!stopDrag) {
        const prevItems = [...newItems];
        // todo: if move item out of group remove item from group
        const toMove = newItems.splice(
          this.staticDragData.startItem.itemIndex,
          1,
        );
        newItems.splice(newPosition.itemIndex, 0, ...toMove);
        store.set('items', newItems);
        this.providers.dimension.updateSizesPositionByNewDataIndexes(
          this.dragData.type,
          newItems,
          prevItems,
        );
      }
      dispatch(
        this.revogrid,
        COLUMN_DRAG_END_EVENT,
        this.getData(this.staticDragData, newItems, source),
      );
    }
    this.clearOrder();
  }

  protected clearLocalSubscriptions() {
    each(this.localSubscriptions, ({ target, callback }, key) =>
      target.removeEventListener(key, callback),
    );
  }

  clearOrder() {
    this.staticDragData = null;
    this.dragData = null;
    this.clearLocalSubscriptions();
    this.orderUi.stop(this.revogrid);
  }
  /**
   * Clearing subscription
   */
  clearSubscriptions() {
    super.clearSubscriptions();
    this.clearLocalSubscriptions();
  }

  protected getData(
    { gridEl, dataEl, pin }: StaticData,
    order: number[],
    source: ColumnRegular[] = [],
  ): ColumnDragEventData {
    const gridRect = gridEl.getBoundingClientRect();
    const elRect = dataEl.getBoundingClientRect();
    const scrollOffset = elRect.left - gridRect.left;
    return {
      columns: order.map(index => source[index]).filter(Boolean),
      elRect,
      gridRect,
      order,
      type: pin || 'rgCol',
      scrollOffset,
    };
  }
  protected getDimension(type: MultiDimensionType) {
    return this.providers.dimension.stores[type].getCurrentState();
  }
}

export function getLeftRelative(
  absoluteX: number,
  gridPos: number,
  offset: number,
): number {
  return absoluteX - gridPos - offset;
}

export function getColumnDragPosition(
  targetItem: PositionItem,
  startItem: PositionItem,
  renderOffset: number,
  scrollOffset: number,
): number {
  const insertionEdge =
    startItem.itemIndex > targetItem.itemIndex
      ? targetItem.start
      : targetItem.end;
  return insertionEdge - renderOffset + scrollOffset;
}
