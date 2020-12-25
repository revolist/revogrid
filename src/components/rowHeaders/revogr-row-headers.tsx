import { h, VNode } from '@stencil/core';

import { RevoGrid } from '../../interfaces';
import SelectionStoreConnector from '../../services/selection.store.connector';
import DataStore from '../../store/dataSource/data.store';
import ViewportStore from '../../store/viewPort/viewport.store';
import { UUID } from '../../utils/consts';
import { ElementScroll } from '../viewport/gridScrollingService';
import { ViewportSpace } from '../viewport/viewport.interfaces';
import { RowHeaderRender } from './row-header-render';

type Props = {
	height: number;
	anyView: ViewportSpace.ViewportProps;
  resize: boolean;
  selectionStoreConnector: SelectionStoreConnector;
  rowHeaderColumn?: RevoGrid.RowHeaders;
	onScrollViewport(e: RevoGrid.ViewPortScrollEvent): void;
	onElementToScroll(e: ElementScroll): void;
};

const LETTER_BLOCK_SIZE = 10;

const RevogrRowHeaders = ({
  anyView,
  height,
  selectionStoreConnector,
  rowHeaderColumn,
  onScrollViewport,
  onElementToScroll
}: Props): VNode => {
	  const dataViews: HTMLElement[] = [];
    const viewport = new ViewportStore();

    /** render viewports rows */
    let totalLength = 1;
    const column = { cellTemplate: RowHeaderRender(totalLength), ...rowHeaderColumn };
    for (let data of anyView.dataPorts) {
      const colData = new DataStore<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>('colPinStart');
      const rowSelectionStore = selectionStoreConnector.registerRow(data.position.y);
      colData.updateData([column]);
      dataViews.push(
        <revogr-data
          slot='content'
          {...data}
          colData={colData.store}
          viewportCol={viewport.store}
          readonly={true}
          range={false}
          rowSelectionStore={rowSelectionStore.store}/>
      );
      totalLength += data.dataStore.get('items').length;
    }
    const colSize = rowHeaderColumn?.size || (totalLength.toString().length + 1) * LETTER_BLOCK_SIZE;
    viewport.setViewport({
      realCount: 1,
      virtualSize: 0,
      items: [{
        size: colSize,
        start: 0,
        end: colSize,
        itemIndex: 0
      }]
    });

    const parent = `${anyView.prop[UUID]}-rowHeaders`;
    return <revogr-viewport-scroll
      {...{[UUID]: parent}}
      contentHeight={height}
      contentWidth={0}
      class='rowHeaders'
      key='rowHeaders'
      style={{minWidth: `${colSize}px`}}
      ref={el => onElementToScroll(el)}
      onScrollViewport={e => onScrollViewport(e.detail)}>
      <revogr-header
        {...anyView.headerProp}
        viewportCol={viewport.store}
        parent={parent}
        slot='header'
        colData={[column]}
        canResize={false}/>
      {dataViews}
    </revogr-viewport-scroll>;
};

export default RevogrRowHeaders;
