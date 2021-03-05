import { h, VNode } from '@stencil/core';
import { Edition, RevoGrid } from '../../interfaces';
import { UUID } from '../../utils/consts';
import { ElementScroll } from './viewport';
import { DATA_SLOT, HEADER_SLOT } from './viewport.helpers';
import { ViewportProps } from './viewport.interfaces';
type Props = {
  editors: Edition.Editors;
  useClipboard: boolean;
  readonly: boolean;
  range: boolean;
  rowClass: string;
  resize: boolean;
  columns: ViewportProps[];
  columnFilter: boolean;
  onScroll(e: RevoGrid.ViewPortScrollEvent, key?: RevoGrid.DimensionColPin | string): void;
  onEdit(edit: Edition.BeforeEdit): void;
  registerElement(el: ElementScroll | null, key: string): void;
};
/**
 * All render based on sections
 * First we render vertical parts - pinned start, data, pinned end
 * Per each column we render data collections: headers, pinned top, center data, pinned bottom
 */
export const ViewPortSections = ({ resize, editors, rowClass, readonly, range, columns, useClipboard, columnFilter, registerElement, onEdit, onScroll }: Props) => {
  const viewPortHtml: VNode[] = [];
  /** render viewports columns */
  for (let view of columns) {
    /** render viewports rows */
    const dataViews: HTMLElement[] = [
      <revogr-header
        viewportCol={view.viewportCol}
        {...view.headerProp}
        selectionStore={view.columnSelectionStore}
        slot={HEADER_SLOT}
        columnFilter={columnFilter}
        canResize={resize}
      />,
    ];
    view.dataPorts.forEach((data, j) => {
      const key = view.prop.key + (j + 1);

      const dataView = (
        <revogr-overlay-selection
          {...data}
          slot={data.slot}
          selectionStore={data.segmentSelectionStore}
          editors={editors}
          readonly={readonly}
          range={range}
          useClipboard={useClipboard}
          onSetEdit={({ detail }) => onEdit(detail)}
        >
          <revogr-data
            {...data}
            {...{ [UUID]: data.uuid }}
            key={key}
            readonly={readonly}
            range={range}
            rowClass={rowClass}
            rowSelectionStore={data.rowSelectionStore}
            slot={DATA_SLOT}
          />
          <revogr-temp-range selectionStore={data.segmentSelectionStore} dimensionRow={data.dimensionRow} dimensionCol={data.dimensionCol} />
          <revogr-focus selectionStore={data.segmentSelectionStore} dimensionRow={data.dimensionRow} dimensionCol={data.dimensionCol} />
        </revogr-overlay-selection>
      );
      dataViews.push(dataView);
    });
    viewPortHtml.push(
      <revogr-viewport-scroll {...view.prop} ref={el => registerElement(el, view.prop.key)} onScrollViewport={e => onScroll(e.detail, view.prop.key)}>
        {dataViews}
      </revogr-viewport-scroll>,
    );
  }
  return viewPortHtml;
};
