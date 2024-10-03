import { h, Component, Method, Prop, State, VNode } from '@stencil/core';
import type { ExtraNodeFuncConfig } from '@type';

/**
 * Contains extra elements for stencil components.
 * Performs rendering and updates for external components.
 * 
 * @example
 * In Plugins if you want to add extra elements to grid and use stenciljs vnodes reactivity:
 * function paginationPanel(this: PaginationPlugin, config: { refresh: () => void }) {
 *    // use `config.refresh()` for component to re-render
 *    return h('div')
 * }
 * 
 * revogrid.registerVNode = [
 *    ...existingNodes,
 *     paginationPanel.bind(this)
 * ];


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
  @Prop() nodes: (
    | VNode
    | ((c?: Partial<ExtraNodeFuncConfig>) => VNode)
  )[] = [];
  /**
   * Force component to re-render
   */
  @State() update = 1;

  /**
   * Refreshes the extra component. Useful if you want to manually
   * force the component to re-render.
   */
  @Method() async refresh() {
    this.update *= -1;
  }

  render() {
    return this.nodes?.map(node => {
      // Check if node is a function or a stencil component
      // If function wrap it in a stencil component with the refresh function
      if (typeof node === 'function') {
        const config: Partial<ExtraNodeFuncConfig> = {};
        const getNodes = () => [node({ refresh: () => config.refresh?.() })];

        return (
          <revogr-extra
            nodes={getNodes()}
            ref={(el?: HTMLRevogrExtraElement) => {
              if (el) {
                // Update exclusively for current node
                config.refresh = () => {
                  el.nodes = getNodes();
                };
              }
            }}
          />
        );
      }
      return node;
    });
  }
}
