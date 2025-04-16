import {
  h,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
} from '@stencil/core';

import { isFilterBtn } from './filter.button';
/**
 * Filter popup component that handles positioning and outside click detection
 */
@Component({
  tag: 'revogr-filter-popup',
  styleUrl: 'filter.style.scss',
})
export class FilterPopup {
  @Element() element!: HTMLElement;
  @State() visible = false;
  @State() position = { x: 0, y: 0 };
  @Prop() closeOnOutsideClick = true;
  @Event() close: EventEmitter<void>;

  @Method() async show(x: number, y: number) {
    this.position = { x, y };
    this.visible = true;
    
    // Auto-correct position if needed
    this.autoCorrect();
  }

  @Method() async hide() {
    this.visible = false;
  }

  @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent) {
    if (!this.visible) {
      return;
    }

    const path = e.composedPath();
    const isOutside = !path.includes(this.element);

    if (
      e.target instanceof HTMLElement &&
      isOutside &&
      !isFilterBtn(e.target) &&
      this.closeOnOutsideClick
    ) {
      this.hide();
      this.close.emit();
    }
  }

  private autoCorrect() {
    if (!this.element) {
      return;
    }

    const revoGrid = this.element.closest('revo-grid');
    if (!revoGrid) {
      return;
    }

    const pos = this.element.getBoundingClientRect();
    const gridPos = revoGrid.getBoundingClientRect();
    const maxLeft = gridPos.right - pos.width;

    if (pos.left > maxLeft) {
      this.position.x = maxLeft - (this.element.parentElement?.getBoundingClientRect().left ?? 0);
    }
  }

  render() {
    if (!this.visible) {
      return <Host style={{ display: 'none' }}></Host>;
    }

    const style = {
      display: 'block',
      left: `${this.position.x}px`,
      top: `${this.position.y}px`,
    };

    return (
      <Host style={style}>
        <slot />
      </Host>
    );
  }
}
