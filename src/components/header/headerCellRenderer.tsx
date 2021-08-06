import { h, VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import { ResizableElement } from '../../services/resizable.directive';
import ColumnService from '../data/columnService';

type Props = {
  data?: RevoGrid.ColumnTemplateProp;
  props: RevoGrid.CellProps;
};

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
    <ResizableElement {...cellProps}>
      <div class="header-content">{colTemplate}</div>
      {children}
    </ResizableElement>
  );
};
