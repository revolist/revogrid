import { h, VNode } from '@stencil/core';
import { dispatch } from '../../plugins/dispatcher';
import { doPropMerge } from '../data/column.service';
import { ResizableElement } from '../../services/resizable.element';
import { ResizeProps } from '../../services/resizable.directive';
import { CellProps, ColumnTemplateProp } from '@type';

type Props = {
  props: CellProps & Partial<ResizeProps>;
  additionalData: any;
  data?: ColumnTemplateProp;
};

export const ON_COLUMN_CLICK = 'columnclick';

export const HeaderCellRenderer = ({ data, props, additionalData }: Props, children: VNode[]): VNode => {
  let colTemplate: VNode | VNode[] | string = data?.name || '';
  let cellProps = props;
  if (data?.columnTemplate) {
    colTemplate = data.columnTemplate(h, data, additionalData);
  }
  if (data?.columnProperties) {
    const extra = data.columnProperties(data);
    if (extra && typeof extra === 'object') {
      cellProps = doPropMerge(props, extra);
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
