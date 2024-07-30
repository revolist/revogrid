import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  VNode,
  h,
} from '@stencil/core';

/**
 * VNode to html converter for stencil components.
 * Transform VNode to html string.
 */
/**
 * @internal
 */
@Component({
  tag: 'vnode-html',
})
export class VNodeToHtml {
  @Prop() redraw: (() => VNode[]) | null | undefined = null;
  @Event() html: EventEmitter<{ html: string; vnodes: VNode[] }>;
  @Element() el: HTMLElement;

  private vnodes: VNode[] = [];

  componentDidRender() {
    this.html.emit({
      html: this.el.innerHTML,
      vnodes: this.vnodes,
    });
  }

  render() {
    this.vnodes = this.redraw?.() || [];
    return (
      <Host
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        {this.vnodes}
      </Host>
    );
  }
}
