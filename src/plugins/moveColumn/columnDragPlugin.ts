/**
 * Plugin for column manual move
 */
import debounce from 'lodash/debounce';
import each from 'lodash/each';
import { RevoGrid } from '../../interfaces';
import ColumnDataProvider from '../../services/column.data.provider';
import { DataProvider } from '../../services/data.provider';
import DimensionProvider from '../../services/dimension.provider';
import SelectionStoreConnector from '../../services/selection.store.connector';
import ViewportProvider from '../../services/viewport.provider';
import { getItemByPosition } from '../../store/dimension/dimension.helpers';
import BasePlugin from '../basePlugin';
import { ColumnOrderHandler } from './columnOrderHandler';
import { dispatch } from '../dispatcher';
import { isColGrouping } from '../groupingColumn/grouping.col.plugin';

const COLUMN_CLICK = 'column-click';
const MOVE = 'column-mouse-move';
const DRAG_END = 'column-drag-end';
const BEFORE_DRAG_END = 'before-column-drag-end';

// use this event subscription to drop D&D for particular columns
const DRAG_START = 'column-drag-start';

export type DragStartEventDetails = {
  event: MouseEvent;
  data: RevoGrid.ColumnDataSchema;
};

export type Providers = {
  data: DataProvider;
  dimension: DimensionProvider;
  selection: SelectionStoreConnector;
  column: ColumnDataProvider;
  viewport: ViewportProvider;
};
type StaticData = {
  startPos: number;
  startItem: RevoGrid.PositionItem;
  data: RevoGrid.ColumnRegular;
  dataEl: HTMLElement;
  scrollEl: Element;
  gridEl: HTMLElement;
  cols: RevoGrid.DimensionSettingsState;
};

type LocalSubscriptions = Record<string, LocalSubscription>;
type LocalSubscription = {
  target: Element | Document;
  callback(...params: any[]): void;
};
export type EventData = {
  elRect: DOMRect;
  gridRect: DOMRect;
  scrollOffset: number;
  type: RevoGrid.DimensionCols;
};
export default class ColumnPlugin extends BasePlugin {
  private moveFunc = debounce((e: MouseEvent) => this.doMove(e), 5);
  private staticDragData: StaticData | null = null;
  private dragData: EventData | null = null;
  private readonly orderUi: ColumnOrderHandler;
  protected readonly localSubscriptions: LocalSubscriptions = {};
  constructor(protected revogrid: HTMLRevoGridElement, private providers: Providers) {
    super(revogrid);
    this.orderUi = new ColumnOrderHandler();
    revogrid.registerVNode([this.orderUi.render()]);

    /** Register events */
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
    const { defaultPrevented } = dispatch(this.revogrid, DRAG_START, data);
    // check if allowed to drag particulat column
    if (defaultPrevented) {
      return;
    }
    this.clearOrder();
    const { mouseleave, mouseup, mousemove } = this.localSubscriptions;
    mouseleave.target.addEventListener('mouseleave', mouseleave.callback);
    mouseup.target.addEventListener('mouseup', mouseup.callback);

    const dataEl = (event.target as HTMLElement).closest('revogr-header');
    const scrollEl = (event.target as HTMLElement).closest('revogr-viewport-scroll');
    if (!dataEl || !scrollEl) {
      return;
    }

    if (isColGrouping(data)) {
      return;
    }

    const cols = this.getDimension(data.pin || 'rgCol');
    const gridRect = this.revogrid.getBoundingClientRect();
    const elRect = dataEl.getBoundingClientRect();
    const startItem = getItemByPosition(
      cols,
      getLeftRelative(event.x, gridRect.left, elRect.left - gridRect.left));
  
    this.staticDragData = {
      startPos: event.x,
      startItem,
      data,
      dataEl,
      scrollEl,
      gridEl: this.revogrid,
      cols,
    };
    this.dragData = this.getData(this.staticDragData);
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

    const dragData = (this.dragData = this.getData(this.staticDragData));
    if (!dragData) {
      return;
    }
    const start = this.staticDragData.startPos;
    if (Math.abs(start - e.x) > 10) {
      const x = getLeftRelative(e.x, this.dragData.gridRect.left, this.dragData.scrollOffset);
      const rgCol = getItemByPosition(this.staticDragData.cols, x);
      this.orderUi.autoscroll(x, dragData.elRect.width);
      this.orderUi.showHandler(
        rgCol.end + dragData.scrollOffset,
        dragData.gridRect.width
      );
    }
  }

  move(e: MouseEvent): void {
    dispatch(this.revogrid, MOVE, { ...e });
    // then do move
    this.moveFunc(e);
  }
  onMouseOut(_: MouseEvent) {
    this.clearOrder();
  }
  onMouseUp(e: MouseEvent) {
    // apply new positions
    if (this.dragData) {
      let relativePos = getLeftRelative(e.x, this.dragData.gridRect.left, this.dragData.scrollOffset);
      if (relativePos < 0) {
        relativePos = 0;
      }
      const newPosition = getItemByPosition(this.staticDragData.cols, relativePos);

      const store = this.providers.column.stores[this.dragData.type].store;
      const items = [...store.get('items')];

      // prevent position change if needed
      const { defaultPrevented: stopDrag } = dispatch(this.revogrid, BEFORE_DRAG_END, {
        ...this.staticDragData,
        startPosition: this.staticDragData.startItem,
        newPosition,
        newItem: store.get('source')[items[this.staticDragData.startItem.itemIndex]]
      });
      if (!stopDrag) {
        // todo: if move item out of group remove item from group
        const toMove = items.splice(this.staticDragData.startItem.itemIndex, 1);
        items.splice(newPosition.itemIndex, 0, ...toMove);
        store.set('items', items);
      }
      dispatch(this.revogrid, DRAG_END, this.dragData);
    }
    this.clearOrder();
  }

  private clearLocalSubscriptions() {
    each(this.localSubscriptions, ({ target, callback }, key) => target.removeEventListener(key, callback));
  }

  clearOrder() {
    this.staticDragData = null;
    this.dragData = null;
    this.clearLocalSubscriptions();
    this.orderUi.stop();
  }
  /**
   * Clearing subscription
   */
  protected clearSubscriptions() {
    super.clearSubscriptions();
    this.clearLocalSubscriptions();
  }

  private getData({
    gridEl,
    dataEl,
    data,
  }: StaticData): EventData {
    const gridRect = gridEl.getBoundingClientRect();
    const elRect = dataEl.getBoundingClientRect();
    const scrollOffset = elRect.left - gridRect.left;
    return {
      elRect,
      gridRect,
      type: data.pin || 'rgCol',
      scrollOffset,
    };
  }
  private getDimension(type: RevoGrid.MultiDimensionType) {
    return this.providers.dimension.stores[type].getCurrentState();
  }
}

export function getLeftRelative(
  absoluteX: number,
  gridPos: number,
  offset: number
): number {
  return absoluteX - gridPos - offset;
}
