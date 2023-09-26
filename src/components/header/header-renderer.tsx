import { h, VNode } from '@stencil/core';
import { FilterButton } from '../../plugins/filter/filter.button';
import { SortingSign } from '../../plugins/sorting/sorting.sign';
import { ResizeEvent, ResizeProps } from '../../services/resizable.directive';
import { DATA_COL, FOCUS_CLASS, HEADER_CLASS, HEADER_SORTABLE_CLASS, MIN_COL_SIZE } from '../../utils/consts';
import { HeaderCellRenderer } from './header-cell-renderer';
import { VirtualPositionItem, ColumnTemplateProp, InitialHeaderClick, CellProps } from '../../types/interfaces';
import { RangeArea } from '../../types/selection';

type Props = {
  column: VirtualPositionItem;
  additionalData: any;
  data?: ColumnTemplateProp;
  range?: RangeArea;
  canResize?: boolean;
  canFilter?: boolean;
  onResize?(e: ResizeEvent): void;
  onClick?(data: InitialHeaderClick): void;
  onDoubleClick?(data: InitialHeaderClick): void;
} & Partial<Pick<ResizeProps, 'active'>>;

const HeaderRenderer = (p: Props): VNode => {
  const cellClass: { [key: string]: boolean } = {
    [HEADER_CLASS]: true,
    [HEADER_SORTABLE_CLASS]: !!p.data?.sortable,
  };
  if (p.data?.order) {
    cellClass[p.data.order] = true;
  }
  const dataProps: CellProps & Partial<ResizeProps> = {
    [DATA_COL]: p.column.itemIndex,
    canResize: p.canResize,
    minWidth: p.data?.minSize || MIN_COL_SIZE,
    maxWidth: p.data?.maxSize,
    active: p.active || ['r'],
    class: cellClass,
    style: { width: `${p.column.size}px`, transform: `translateX(${p.column.start}px)` },
    onResize: p.onResize,
    onDoubleClick(originalEvent: MouseEvent) {
      p.onDoubleClick({ column: p.data, index: p.column.itemIndex, originalEvent });
    },
    onClick(originalEvent: MouseEvent) {
      if (originalEvent.defaultPrevented || !p.onClick) {
        return;
      }
      p.onClick({ column: p.data, index: p.column.itemIndex, originalEvent });
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
    <HeaderCellRenderer data={p.data} props={dataProps} additionalData={p.additionalData}>
      {p.data?.order ? <SortingSign column={p.data} /> : ''}
      {p.canFilter && p.data?.filter !== false ? <FilterButton column={p.data} /> : ''}
    </HeaderCellRenderer>
  );
};

export default HeaderRenderer;
