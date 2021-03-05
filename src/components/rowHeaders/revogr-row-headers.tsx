import { h, VNode } from '@stencil/core';

import { RevoGrid } from '../../interfaces';
import DataStore from '../../store/dataSource/data.store';
import { SelectionStore } from '../../store/selection/selection.store';
import ViewportStore from '../../store/viewPort/viewport.store';
import { UUID } from '../../utils/consts';
import { ElementScroll } from '../revo-grid/viewport.scrolling.service';
import { ViewportProps } from '../revo-grid/viewport.interfaces';
import { RowHeaderRender } from './row-header-render';

type Props = {
  height: number;
  anyView: ViewportProps;
  resize: boolean;
  rowHeaderColumn?: RevoGrid.RowHeaders;
  beforeRowAdd(y: number): SelectionStore;
  onScrollViewport(e: RevoGrid.ViewPortScrollEvent): void;
  onElementToScroll(e: ElementScroll): void;
};

const LETTER_BLOCK_SIZE = 10;

const RevogrRowHeaders = ({ anyView, height, rowHeaderColumn, beforeRowAdd, onScrollViewport, onElementToScroll }: Props): VNode => {
  const dataViews: HTMLElement[] = [];
  const viewport = new ViewportStore();

  /** render viewports rows */
  let totalLength = 1;

  for (let data of anyView.dataPorts) {
    const colData = new DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>('colPinStart');
    const rowSelectionStore = beforeRowAdd(data.position.y);

    const dataStore = new DataStore<RevoGrid.DataType, RevoGrid.DimensionRows>(data.type);
    dataStore.updateData(data.dataStore.get('source'));
    // initiate column data
    const column = { cellTemplate: RowHeaderRender(totalLength), ...rowHeaderColumn };
    colData.updateData([column]);
    dataViews.push(
      <revogr-data
        slot="content"
        {...data}
        dataStore={dataStore.store}
        colData={colData.store}
        viewportCol={viewport.store}
        readonly={true}
        range={false}
        rowSelectionStore={rowSelectionStore.store}
      />,
    );
    totalLength += data.dataStore.get('items').length;
  }

  const colSize = rowHeaderColumn?.size || (totalLength.toString().length + 1) * LETTER_BLOCK_SIZE;
  viewport.setViewport({
    realCount: 1,
    virtualSize: 0,
    items: [
      {
        size: colSize,
        start: 0,
        end: colSize,
        itemIndex: 0,
      },
    ],
  });

  const parent = `${anyView.prop[UUID]}-rowHeaders`;
  return (
    <revogr-viewport-scroll
      {...{ [UUID]: parent }}
      contentHeight={height}
      contentWidth={0}
      class="rowHeaders"
      key="rowHeaders"
      style={{ minWidth: `${colSize}px` }}
      ref={el => onElementToScroll(el)}
      onScrollViewport={e => onScrollViewport(e.detail)}
    >
      <revogr-header {...anyView.headerProp} viewportCol={viewport.store} parent={parent} slot="header" canResize={false} />
      {dataViews}
    </revogr-viewport-scroll>
  );
};

export default RevogrRowHeaders;
