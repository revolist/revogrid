import { VNode } from '@stencil/core';
import { JSX } from '../../components';

/**
 * Converts a VNode element into an HTML element and appends it to the specified parentHolder.
 */
export function convertVNodeToHTML(parentHolder: Element, redraw: JSX.VnodeHtml['redraw']): Promise<{ html: string; vnodes: (VNode[]) | null }> {
  return new Promise<{ html: string; vnodes: (VNode[]) | null }>(resolve => {
    const vnode = document.createElement('vnode-html');
    parentHolder.appendChild(vnode);
    vnode.redraw = redraw;
    vnode.addEventListener('html', e => {
      vnode.remove();
      resolve(e.detail);
    });
  });
}
