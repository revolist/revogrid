import { h, VNode } from '@stencil/core';
import { ResizeProps, ResizeDirective, ResizeEvents } from './resizable.directive';
import type { CellProps } from '@type';

export const ResizableElement = (props: Partial<ResizeProps> & CellProps, children: VNode[]) => {
  const resizeEls: VNode[] = [];
  const directive =
    (props.canResize &&
      new ResizeDirective(props, e => {
        if (e.eventName === ResizeEvents.end) {
          props.onResize && props.onResize(e);
        }
      })) ||
    null;
  if (props.canResize) {
    if (props.active) {
      for (let p in props.active) {
        resizeEls.push(
          <div
            onClick={e => e.preventDefault()}
            onDblClick={e => {
              e.preventDefault();
              props.onDoubleClick?.(e);
            }}
            onMouseDown={(e: MouseEvent) => directive?.handleDown(e)}
            onTouchStart={(e: TouchEvent) => directive?.handleDown(e)}
            class={`resizable resizable-${props.active[p]}`}
          />,
        );
      }
    }
  } else {
    if (props.active) {
      for (let p in props.active) {
        resizeEls.push(
          <div
            onClick={e => e.preventDefault()}
            onTouchStart={(e: TouchEvent) => e.preventDefault()}
            onDblClick={e => {
              e.preventDefault();
              props.onDoubleClick?.(e);
            }}
            class={`no-resize resizable resizable-${props.active[p]}`}
          />,
        );
      }
    }
  }
  return (
    <div {...props} ref={(e) => e && directive?.set(e)}>
      {children}
      {resizeEls}
    </div>
  );
};
