import { type FunctionalComponent, h } from '@stencil/core';
import { dispatch } from '../../plugins/dispatcher';
import { doPropMerge } from '../data/column.service';
import {
  ResizableElement,
  ResizableElementHTMLAttributes,
} from './resizable.element';
import { ColumnTemplateProp } from '@type';

export const ON_COLUMN_CLICK = 'columnclick';

const cellRole = /^\s*(columnheader|rowheader|gridcell|cell)(?:\s|$)/;

export const HeaderCellRenderer: FunctionalComponent<{
  props: ResizableElementHTMLAttributes;
  additionalData: any;
  data?: ColumnTemplateProp;
  accessible?: boolean;
}> = ({ data, props, additionalData, accessible }, children) => {
  let colTemplate: ReturnType<typeof h> = data?.name || '';
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
    ...(accessible && {
      'data-rg-header-cell': '',
      'role': cellRole.test(cellProps.role ?? '')
        ? cellProps.role
        : 'columnheader',
    }),
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
