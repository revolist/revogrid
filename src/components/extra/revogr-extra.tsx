import {
    Component,
    Method,
    Prop,
    State,
    VNode,
  } from '@stencil/core';
  
  /**
   * Contains extra elements for stencil components.
   * Performs rendering and updates for external components.
   */
  /**
   * @internal
   */
  @Component({
    tag: 'revogr-extra',
  })
  export class RevoGridExtra {
    /**
     * Nodes to render
     */
    @Prop() nodes: ((VNode) |  (() => VNode))[] | null = null;
    /**
     * Force component to re-render
     */
    @State() update = 1

    /**
     * Refreshes the extra component. Useful if you want to manually
     * force the component to re-render.
     */
    @Method() async refresh() {
        this.update *= -1;
    }

    render() {
      return this.nodes?.map(node => typeof node === 'function' ? node() : node);
    }
  }
  