import { h } from '@stencil/core';
import type {
  VirtualPositionItem,
  ColumnTemplateProp,
  InitialHeaderClick,
  ProvidersColumns,
  RangeArea,
} from '@type';

import { FilterButton } from '../../plugins/filter/filter.button';
import { SortingSign } from '../../plugins/sorting/sorting.sign';
import { ResizeEvent, ResizeProps } from './resizable.directive';
import {
  DATA_COL,
  FOCUS_CLASS,
  HEADER_CLASS,
  HEADER_SORTABLE_CLASS,
  MIN_COL_SIZE,
} from '../../utils/consts';
import { HeaderCellRenderer } from './header-cell-renderer';
import { ResizableElementHTMLAttributes } from './resizable.element';

export type HeaderRenderProps = {
  column: VirtualPositionItem;
  additionalData: any;
  data: ColumnTemplateProp | null | undefined;
  range?: RangeArea | null;
  canResize?: boolean;
  canFilter?: boolean;
  filterButtonLabel?: string;
  renderOffset?: number;
  onResize?(e: ResizeEvent): void;
  onClick?(data: InitialHeaderClick): void;
  onDblClick?(data: InitialHeaderClick): void;
} & Partial<Pick<ResizeProps, 'active'>>;

type KeyedResizableElementHTMLAttributes = ResizableElementHTMLAttributes & {
  key: string;
};

const HeaderRenderer = (
  p: HeaderRenderProps & { key: string; accessible?: boolean; providers: ProvidersColumns },
): ReturnType<typeof h> => {
  const data = p.data;
  const { order, sortable } = data ?? {};
  const sortIndex = data?.sortIndex;
  const hasSortingSign = data && (sortable || order || sortIndex);
  const hasFilterButton = p.canFilter && data && data.filter !== false;
  const providers = data?.providers ?? p.providers;
  const columnIndex = p.column.itemIndex;
  const range = p.range;
  const inSelectedRange = !!range && columnIndex >= range.x && columnIndex <= range.x1;
  // ARIA exposes the primary sort column when multiple columns are sorted.
  const ariaSort =
    p.accessible && order && (sortIndex ?? 1) === 1
      ? { asc: 'ascending', desc: 'descending' }[order]
      : undefined;
  const dataProps: KeyedResizableElementHTMLAttributes = {
    key: p.key,
    [DATA_COL]: columnIndex,
    ...(ariaSort && { 'aria-sort': ariaSort }),
    canResize: p.canResize,
    minWidth: data?.minSize || MIN_COL_SIZE,
    maxWidth: data?.maxSize,
    active: p.active || ['r'],
    class: {
      [HEADER_CLASS]: true,
      [HEADER_SORTABLE_CLASS]: !!sortable,
      [FOCUS_CLASS]: inSelectedRange,
      ...(order && { [order]: true }),
    },
    style: {
      width: `${p.column.size}px`,
      transform: `translateX(${p.column.start - (p.renderOffset || 0)}px)`,
    },
    onResize: p.onResize,
    onDblClick(originalEvent: MouseEvent) {
      p.onDblClick?.({
        column: data,
        index: columnIndex,
        originalEvent,
        providers,
      });
    },
    onClick(originalEvent: MouseEvent) {
      if (originalEvent.defaultPrevented) {
        return;
      }
      p.onClick?.({
        column: data,
        index: columnIndex,
        originalEvent,
        providers,
      });
    },
  };
  return (
    <HeaderCellRenderer
      accessible={p.accessible}
      data={data}
      props={dataProps}
      additionalData={p.additionalData}
    >
      {hasSortingSign || hasFilterButton ? (
        <span class="header-controls">
          {hasSortingSign ? <SortingSign column={data} /> : null}
          {hasFilterButton ? (
            <FilterButton column={data} label={p.filterButtonLabel} />
          ) : null}
        </span>
      ) : null}
    </HeaderCellRenderer>
  );
};

export default HeaderRenderer;
