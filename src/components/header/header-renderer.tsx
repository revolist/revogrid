import { h } from '@stencil/core';
import type {
  VirtualPositionItem,
  ColumnTemplateProp,
  InitialHeaderClick,
  RangeArea
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
  data: ColumnTemplateProp;
  range?: RangeArea | null;
  canResize?: boolean;
  canFilter?: boolean;
  renderOffset?: number;
  onResize?(e: ResizeEvent): void;
  onClick?(data: InitialHeaderClick): void;
  onDblClick?(data: InitialHeaderClick): void;
} & Partial<Pick<ResizeProps, 'active'>>;

type KeyedResizableElementHTMLAttributes = ResizableElementHTMLAttributes & {
  key: string;
};

const HeaderRenderer = (p: HeaderRenderProps): ReturnType<typeof h> => {
  const hasSortingSign = !!(
    p.data?.sortable ||
    p.data?.order ||
    p.data?.sortIndex
  );
  const cellClass: { [key: string]: boolean } = {
    [HEADER_CLASS]: true,
    [HEADER_SORTABLE_CLASS]: !!p.data?.sortable,
  };
  if (p.data?.order) {
    cellClass[p.data.order] = true;
  }
  const dataProps: KeyedResizableElementHTMLAttributes = {
    key: String(p.data?.prop ?? p.column.itemIndex),
    [DATA_COL]: p.column.itemIndex,
    canResize: p.canResize,
    minWidth: p.data?.minSize || MIN_COL_SIZE,
    maxWidth: p.data?.maxSize,
    active: p.active || ['r'],
    class: cellClass,
    style: {
      width: `${p.column.size}px`,
      transform: `translateX(${p.column.start - (p.renderOffset || 0)}px)`,
    },
    onResize: p.onResize,
    onDblClick(originalEvent: MouseEvent) {
      p.onDblClick?.({
        column: p.data,
        index: p.column.itemIndex,
        originalEvent,
        providers: p.data.providers,
      });
    },
    onClick(originalEvent: MouseEvent) {
      if (originalEvent.defaultPrevented || !p.onClick) {
        return;
      }
      p.onClick({
        column: p.data,
        index: p.column.itemIndex,
        originalEvent,
        providers: p.data.providers,
      });
    },
  };
  if (p.range) {
    if (p.column.itemIndex >= p.range.x && p.column.itemIndex <= p.range.x1) {
      if (typeof dataProps.class === 'object') {
        dataProps.class[FOCUS_CLASS] = true;
      }
    }
  }
  return (
    <HeaderCellRenderer
      data={p.data}
      props={dataProps}
      additionalData={p.additionalData}
    >
      {hasSortingSign ? <SortingSign column={p.data} /> : null}
      {p.canFilter && p.data?.filter !== false ? (
        <FilterButton column={p.data} />
      ) : (
        ''
      )}
    </HeaderCellRenderer>
  );
};

export default HeaderRenderer;
