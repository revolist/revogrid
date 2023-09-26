import { h, VNode } from '@stencil/core';
import OrderRenderer, { OrdererService } from '../order/order-renderer';
import { ViewPortScrollEvent } from '../../types/interfaces';
import { DimensionColPin } from '../../types/dimension';
import { DimensionStoreCollection } from '../../store/dimension/dimension.store';
import { ViewportStoreCollection } from '../../store/viewport/viewport.store';

export interface ElementScroll {
  changeScroll?(e: ViewPortScrollEvent): Promise<ViewPortScrollEvent>;
  setScroll(e: ViewPortScrollEvent): Promise<void>;
}

type Props = {
  viewports: ViewportStoreCollection;
  dimensions: DimensionStoreCollection;
  orderRef(e: OrdererService): void;
  registerElement(el: ElementScroll | null, key: string): void;
  onScroll(e: ViewPortScrollEvent, key?: DimensionColPin | string): void;
  nakedClick(e: MouseEvent): void;
};

export const RevoViewPort = ({ viewports, dimensions, orderRef, nakedClick, registerElement, onScroll }: Props, children: VNode[]) => {
  const viewPortClick = (e: MouseEvent, el?: HTMLElement) => {
    if (el === e.target) {
      nakedClick(e);
    }
  };

  let el: HTMLElement;
  const typeRow = 'rgRow';
  const typeCol = 'rgCol';
  return [
    <div class="main-viewport" ref={e => (el = e)} onClick={e => viewPortClick(e, el)}>
      <div class="viewports">
        {children}
        <revogr-scroll-virtual
          class="vertical"
          dimension={ typeRow }
          viewportStore={viewports[typeRow].store}
          dimensionStore={dimensions[typeRow].store}
          ref={el => registerElement(el, 'rowScroll')}
          onScrollVirtual={e => onScroll(e.detail)}
        />
        <OrderRenderer ref={orderRef} />
      </div>
    </div>,
    <revogr-scroll-virtual
      class="horizontal"
      dimension={ typeCol }
      viewportStore={viewports[typeCol].store}
      dimensionStore={dimensions[typeCol].store}
      ref={el => registerElement(el, 'colScroll')}
      onScrollVirtual={e => onScroll(e.detail)}
    />,
  ];
};
