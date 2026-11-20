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
  const keyboardSortable = accessible && data?.sortable;
  const resizeProps = {
    ...cellProps,
    ...(accessible && {
      'data-rg-header-cell': '',
      'role': cellRole.test(cellProps.role ?? '')
        ? cellProps.role
        : 'columnheader',
    }),
    ...(keyboardSortable && {
      tabIndex: 0,
      onKeyDown(event: KeyboardEvent) {
        cellProps.onKeyDown?.(event);
        const isHeaderEnter =
          event.key === 'Enter' &&
          event.target === event.currentTarget &&
          !event.repeat;
        if (event.defaultPrevented || !isHeaderEnter) {
          return;
        }
        event.preventDefault();
        // Use the cancellable header click path and keep its MouseEvent payload.
        event.currentTarget?.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            shiftKey: event.shiftKey,
          }),
        );
      },
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
