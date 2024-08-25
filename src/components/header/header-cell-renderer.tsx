import { FunctionalComponent, h, VNode } from '@stencil/core';
import { dispatch } from '../../plugins/dispatcher';
import { doPropMerge } from '../data/column.service';
import {
  ResizableElement,
  ResizableElementHTMLAttributes,
} from './resizable.element';
import { ColumnTemplateProp } from '@type';

export const ON_COLUMN_CLICK = 'columnclick';

export const HeaderCellRenderer: FunctionalComponent<{
  props: ResizableElementHTMLAttributes;
  additionalData: any;
  data?: ColumnTemplateProp;
}> = ({ data, props, additionalData }, children) => {
  let colTemplate: VNode | VNode[] | string = data?.name || '';
  let cellProps = props;
  if (data?.columnTemplate) {
    colTemplate = data.columnTemplate(h, data, additionalData);
  }
  if (data?.columnProperties) {
    const extra = data.columnProperties(data);
    if (extra) {
      cellProps = doPropMerge(props, extra);
    }
  }
  const resizeProps = {
    ...cellProps,
    onMouseDown(e: MouseEvent) {
      dispatch(e.currentTarget, ON_COLUMN_CLICK, {
        data,
        event: e,
      });
    },
  };
  return (
    <ResizableElement {...resizeProps}>
      <div class="header-content">{colTemplate}</div>
      {children}
    </ResizableElement>
  );
};
