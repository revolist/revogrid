import { JSX } from '../..';

/**
 * Converts a VNode element into an HTML element and appends it to the specified parentHolder.
 */
export function convertVNodeToHTML(parentHolder: Element, redraw: JSX.VnodeHtml['redraw']) {
  return new Promise<HTMLVnodeHtmlElementEventMap['html']>(resolve => {
    const vnode = document.createElement('vnode-html');
    parentHolder.appendChild(vnode);
    vnode.redraw = redraw;
    vnode.addEventListener('html', e => {
      vnode.remove();
      resolve(e.detail);
    });
  });
}
