import { h, VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import { dispatch } from '../../plugins/dispatcher';
import { ResizableElement } from '../../services/resizable.directive';
import ColumnService from '../data/columnService';

type Props = {
  data?: RevoGrid.ColumnRegular;
  props: RevoGrid.CellProps;
};

const ON_COLUMN_CLICK = 'column-click';

export const HeaderCellRenderer = ({ data, props }: Props, children: VNode[]): VNode => {
  let colTemplate: VNode | VNode[] | string = data?.name || '';
  let cellProps = props;
  if (data?.columnTemplate) {
    colTemplate = data.columnTemplate(h, data);
  }
  if (data?.columnProperties) {
    const extra = data.columnProperties(data);
    if (extra && typeof extra === 'object') {
      cellProps = ColumnService.doMerge(props, extra);
    }
  }
  return (
    <ResizableElement {...cellProps} onMouseDown={(e: MouseEvent) => {
      dispatch(e.currentTarget as HTMLElement, ON_COLUMN_CLICK, {
        data,
        event: e,
      });
     }}>
      <div class="header-content">{colTemplate}</div>
      {children}
    </ResizableElement>
  );
};
