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
};

export const RevoViewPort = ({ viewports, dimensions, orderRef, registerElement, onScroll }: Props, children: VNode[]) => {
  return [
    <div class="main-viewport">
      <div class="viewports">
        {children}
        <revogr-scroll-virtual
          class="vertical"
          dimension="row"
          viewportStore={viewports['row'].store}
          dimensionStore={dimensions['row'].store}
          ref={el => registerElement(el, 'rowScroll')}
          onScrollVirtual={e => onScroll(e.detail)}
        />
        <OrderRenderer ref={orderRef} />
      </div>
    </div>,
    <revogr-scroll-virtual
      class="horizontal"
      dimension="col"
      viewportStore={viewports['col'].store}
      dimensionStore={dimensions['col'].store}
      ref={el => registerElement(el, 'colScroll')}
      onScrollVirtual={e => onScroll(e.detail)}
    />,
  ];
};
