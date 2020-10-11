import { h, VNode } from "@stencil/core";
import { RevoGrid } from "../../interfaces";
import SelectionStoreConnector from "../../services/selection.store.connector";
import ViewportStore from "../../store/viewPort/viewport.store";
import { UUID } from "../../utils/consts";
import { ElementScroll } from "../viewport/gridScrollingService";
import { ViewportSpace } from "../viewport/viewport.interfaces";

type Props = {
	height: number;
	anyView: ViewportSpace.ViewportProps;
  resize: boolean;
  selectionStoreConnector: SelectionStoreConnector;
	onScrollViewport(e: RevoGrid.ViewPortScrollEvent): void;
	onElementToScroll(e: ElementScroll): void;
};

const RevogrRowHeaders = ({anyView, height, selectionStoreConnector, onScrollViewport, onElementToScroll}: Props, _children: VNode[]): VNode => {
	const dataViews: HTMLElement[] = [];
    const viewport = new ViewportStore();
    viewport.setViewport({
      realCount: 1,
      virtualSize: 0,
      items: [{ size: 0, start: 0, end: 0, itemIndex: 0 }]
    });
    /** render viewports rows */
    let totalLength = 0;
    for (let data of anyView.dataPorts) {
      const rowSelectionStore = selectionStoreConnector.registerRow(data.position.y);
      const start = totalLength;
      dataViews.push(
        <revogr-data
          slot='content'
          {...data}
          colData={[{ cellTemplate: (_h, e: {rowIndex: number}) => (start + e.rowIndex) }]}
          viewportCol={viewport.store}
          readonly={true}
          range={false}
          rowSelectionStore={rowSelectionStore.store}/>
      );
      totalLength += data.dataStore.get('items').length;
    }
    const size = totalLength;
    const parent = `${anyView.prop[UUID]}-rowHeaders`;
    return <revogr-viewport-scroll
      {...{[UUID]: parent}}
      contentHeight={height}
      contentWidth={0}
      class='rowHeaders'
      key='rowHeaders'
      style={{minWidth: `${size.toString().length + 1}em`}}
      ref={el => onElementToScroll(el)}
      onScrollViewport={e => onScrollViewport(e.detail)}>
      <revogr-header
        {...anyView.headerProp}
        viewportCol={viewport.store}
        parent={parent}
        slot='header'
        colData={[]}
        canResize={false}/>
      {dataViews}
    </revogr-viewport-scroll>;
};

export default RevogrRowHeaders;
