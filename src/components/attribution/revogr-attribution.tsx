import { Component, Host, h } from '@stencil/core';
/**
 * If you’re thinking about removing the attribution, we’d like to share a few thoughts first:
 * If you’re using RevoGrid in your organization and it’s helping you make money, we depend on your support to keep improving and maintaining RevoGrid under an MIT License.
 * Before you remove the attribution, please consider how you can support RevoGrid to help keep it running smoothly.
 * Using RevoGrid for a personal project? Awesome! Feel free to remove the attribution. We appreciate your support.
 */
/**
 * @internal
 */
@Component({
  tag: 'revogr-attribution',
})
export class Attribution {
  render() {
    return (
      <Host>
        <a
          href="https://rv-grid.com/guide/attribution"
          target="_blank"
          rel="noopener noreferrer"
          title="Made with ❤️ by Revolist OU Team"
          class="value"
        >
          RevoGrid
        </a>
      </Host>
    );
  }
}
