import { h, VNode } from '@stencil/core';
import { Edition, RevoGrid } from '../../interfaces';
import { UUID } from '../../utils/consts';
import { ElementScroll } from './viewport';
import { DATA_SLOT, HEADER_SLOT } from './viewport.helpers';
import { ViewportProps } from './viewport.interfaces';
import { isMobileDevice } from '../../utils/mobile';
type Props = {
  editors: Edition.Editors;
  useClipboard: boolean;
  applyEditorChangesOnClose: boolean;
  readonly: boolean;
  range: boolean;
  rowClass: string;
  resize: boolean;
  columns: ViewportProps[];
  columnFilter: boolean;
  additionalData: any;
  focusTemplate: RevoGrid.FocusTemplateFunc;
  scrollSection(
    e: RevoGrid.ViewPortScrollEvent,
    key?: RevoGrid.DimensionColPin | string,
  ): void;
  scrollSectionSilent(
    e: RevoGrid.ViewPortScrollEvent,
    key?: RevoGrid.DimensionColPin | string,
  ): void;
  onCancelEdit(): void;
  onEdit(edit: Edition.BeforeEdit): void;
  onSelectAll(): void;
  registerElement(el: ElementScroll | null, key: string): void;
};
/**
 * The code renders a view port divided into sections.
 * It starts by rendering the pinned start, data, and pinned end sections.
 * Within each section, it renders columns along with their headers, pinned top, center data, and pinned bottom.
 * The code iterates over the columns and their data to generate the view port's HTML structure.
 * Finally, the rendered sections are returned as the result.
 */
export const ViewPortSections = ({
  resize,
  editors,
  rowClass,
  readonly,
  range,
  columns,
  useClipboard,
  columnFilter,
  applyEditorChangesOnClose,
  additionalData,
  onCancelEdit,
  registerElement,
  onEdit,
  scrollSection,
  focusTemplate,
  onSelectAll,
  scrollSectionSilent,
}: Props) => {
  const isMobile = isMobileDevice();
  const viewPortHtml: VNode[] = [];
  /** render viewports columns */
  for (let view of columns) {
    /** render viewports rows */
    const headerProperties = {
      ...view.headerProp,
      type: view.type,
      additionalData,
      viewportCol: view.viewportCol,
      selectionStore: view.columnSelectionStore,
      canResize: resize,
      columnFilter,
    };
    const dataViews: HTMLElement[] = [
      <revogr-header {...headerProperties} slot={HEADER_SLOT} />,
    ];
    view.dataPorts.forEach((data, j) => {
      const key = view.prop.key + (j + 1);

      const dataView = (
        <revogr-overlay-selection
          {...data}
          isMobileDevice={isMobile}
          selectionStore={data.segmentSelectionStore}
          onSelectall={() => onSelectAll()}
          editors={editors}
          readonly={readonly}
          range={range}
          useClipboard={useClipboard}
          onCancelEdit={() => onCancelEdit()}
          applyChangesOnClose={applyEditorChangesOnClose}
          onSetEdit={({ detail }) => onEdit(detail)}
          additionalData={additionalData}
          slot={data.slot}
        >
          <revogr-data
            {...data}
            {...{ [UUID]: data.uuid }}
            key={key}
            readonly={readonly}
            range={range}
            rowClass={rowClass}
            rowSelectionStore={data.rowSelectionStore}
            additionalData={additionalData}
            slot={DATA_SLOT}
          >
            <slot name={`data-${view.type}-${data.type}`} />
          </revogr-data>
          <revogr-temp-range
            selectionStore={data.segmentSelectionStore}
            dimensionRow={data.dimensionRow}
            dimensionCol={data.dimensionCol}
          />
          <revogr-focus
            colData={data.colData}
            dataStore={data.dataStore}
            focusTemplate={focusTemplate}
            rowType={data.type}
            colType={view.type}
            selectionStore={data.segmentSelectionStore}
            dimensionRow={data.dimensionRow}
            dimensionCol={data.dimensionCol}
          >
            <slot name={`focus-${view.type}-${data.type}`} />
          </revogr-focus>
        </revogr-overlay-selection>
      );
      dataViews.push(dataView);
    });
    viewPortHtml.push(
      <revogr-viewport-scroll
        {...view.prop}
        ref={el => registerElement(el, view.prop.key)}
        onScrollViewport={e => scrollSection(e.detail, view.prop.key)}
        onSilentScroll={e => scrollSectionSilent(e.detail, view.prop.key)}
      >
        {dataViews}
      </revogr-viewport-scroll>,
    );
  }
  return viewPortHtml;
};
