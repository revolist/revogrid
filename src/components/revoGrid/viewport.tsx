import { h, VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import { DimensionStores } from '../../services/dimension.provider';
import { ViewportStores } from '../../services/viewport.provider';
import OrderRenderer, { OrdererService } from '../order/orderRenderer';

export interface ElementScroll {
  changeScroll?(e: RevoGrid.ViewPortScrollEvent): Promise<RevoGrid.ViewPortScrollEvent>;
  setScroll(e: RevoGrid.ViewPortScrollEvent): Promise<void>;
}

type Props = {
  viewports: ViewportStores;
  dimensions: DimensionStores;
  orderRef(e: OrdererService): void;
  registerElement(el: ElementScroll | null, key: string): void;
  onScroll(e: RevoGrid.ViewPortScrollEvent, key?: RevoGrid.DimensionColPin | string): void;
  nakedClick(e: MouseEvent): void;
};

export const RevoViewPort = ({ viewports, dimensions, orderRef, nakedClick, registerElement, onScroll }: Props, children: VNode[]) => {
  const viewPortClick = (e: MouseEvent, el?: HTMLElement) => {
    if (el === e.target) {
      nakedClick(e);
    }
  };

  let el: HTMLElement;
  return [
    <div class="main-viewport" ref={e => (el = e)} onClick={e => viewPortClick(e, el)}>
      <div class="viewports">
        {children}
        <revogr-scroll-virtual
          class="vertical"
          dimension="rgRow"
          viewportStore={viewports['rgRow'].store}
          dimensionStore={dimensions['rgRow'].store}
          ref={el => registerElement(el, 'rowScroll')}
          onScrollVirtual={e => onScroll(e.detail)}
        />
        <OrderRenderer ref={orderRef} />
      </div>
    </div>,
    <revogr-scroll-virtual
      class="horizontal"
      dimension="rgCol"
      viewportStore={viewports['rgCol'].store}
      dimensionStore={dimensions['rgCol'].store}
      ref={el => registerElement(el, 'colScroll')}
      onScrollVirtual={e => onScroll(e.detail)}
    />,
  ];
};
