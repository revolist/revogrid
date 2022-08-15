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

const COLUMN_CLICK = 'column-click';
const MOVE = 'column-mouse-move';
const DRAG_END = 'column-drag-end';
const BEFORE_DRAG_END = 'before-column-drag-end';

// use this event subscription to drop D&D for particular columns
const DRAG_START = 'column-drag-start';

export type DragStartEventDetails = {
  event: MouseEvent;
  data: RevoGrid.ColumnRegular;
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
  data: DragStartEventDetails['data'];
  dataEl: HTMLElement;
  scrollEl: Element;
  gridEl: HTMLElement;
};

type LocalSubscriptions = Record<string, LocalSubscription>;
type LocalSubscription = {
  target: Element | Document;
  callback(...params: any[]): void;
};
export type EventData = {
  el: HTMLElement;
  elScroll: Element;
  elRect: DOMRect;
  gridRect: DOMRect;
  xOffset: number;
  data: StaticData['data'];
  type: RevoGrid.DimensionCols;
  rows: RevoGrid.DimensionSettingsState;
  cols: RevoGrid.DimensionSettingsState;
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
    this.staticDragData = {
      startPos: event.x,
      data,
      dataEl,
      scrollEl,
      gridEl: this.revogrid,
    };
    this.dragData = this.getData(this.staticDragData);
    mousemove.target.addEventListener('mousemove', mousemove.callback);
    this.orderUi.start(event, this.dragData);
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
      const x = getLeftRelative(e.x, dragData);
      const rgCol = getItemByPosition(dragData.cols, x);
      this.orderUi.autoscroll(x, dragData.elRect.width);
      this.orderUi.showHandler(
        rgCol.end + dragData.xOffset,
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
      const newItem = getItemByPosition(this.dragData.cols, getLeftRelative(e.x, this.dragData));
      const startItem = getItemByPosition(this.dragData.cols, getLeftRelative(this.staticDragData.startPos, this.dragData));

      // prevent position change if needed
      const { defaultPrevented: stopDrag } = dispatch(this.revogrid, BEFORE_DRAG_END, {
        ...this.staticDragData,
        startPosition: startItem,
        newPosition: newItem,
      });
      if (!stopDrag) {
        const store = this.providers.column.stores[this.dragData.type].store;
        const items = [...store.get('items')];
        const toMove = items.splice(startItem.itemIndex, 1);
        items.splice(newItem.itemIndex, 0, ...toMove);
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
    scrollEl,
    data,
  }: StaticData): EventData {
    const gridRect = gridEl.getBoundingClientRect();
    const elRect = dataEl.getBoundingClientRect();
    return {
      el: dataEl,
      elScroll: scrollEl,
      elRect,
      gridRect,
      data,
      type: data.pin || 'rgCol',
      xOffset: elRect.left - gridRect.left,
      rows: this.getDimension('rgRow'),
      cols: this.getDimension('rgCol'),
    };
  }
  private getDimension(type: RevoGrid.MultiDimensionType) {
    return this.providers.dimension.stores[type].getCurrentState();
  }
}

export function getLeftRelative(
  absoluteX: number,
  { xOffset, gridRect }: EventData
): number {
  return absoluteX - gridRect.left - xOffset;
}
