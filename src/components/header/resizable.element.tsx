import { type FunctionalComponent, h, type VNode } from '@stencil/core';
import {
  ResizeProps,
  ResizeDirective,
  ResizeEvents,
} from './resizable.directive';
import type { CellProps } from '@type';

export type ResizableElementHTMLAttributes = Partial<ResizeProps> & CellProps;

export const ResizableElement: FunctionalComponent = (
  props: ResizableElementHTMLAttributes,
  children: VNode[],
) => {
  const resizeEls: VNode[] = [];
  const directive =
    (props.canResize &&
      new ResizeDirective(props, e => {
        if (e.eventName === ResizeEvents.end) {
          props.onResize?.(e);
        }
      })) ||
    null;

  if (props.active) {
    if (props.canResize) {
      for (let p in props.active) {
        resizeEls.push(
          <div
            onClick={e => e.preventDefault()}
            onDblClick={e => {
              e.preventDefault();
              props.onDblClick?.(e);
            }}
            onMouseDown={(e: MouseEvent) => directive?.handleDown(e)}
            onTouchStart={(e: TouchEvent) => directive?.handleDown(e)}
            class={`resizable resizable-${props.active[p]}`}
          />,
        );
      }
    } else {
      for (let _p in props.active) {
        resizeEls.push(
          <div
            onClick={e => e.preventDefault()}
            onTouchStart={(e: TouchEvent) => e.preventDefault()}
            onDblClick={e => {
              e.preventDefault();
              props.onDblClick?.(e);
            }}
            class={`no-resize`}
          />,
        );
      }
    }
  }
  return (
    <div {...props} ref={e => e && directive?.set(e)}>
      {children}
      {resizeEls}
    </div>
  );
};
