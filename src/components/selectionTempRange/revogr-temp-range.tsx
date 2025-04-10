import { Component, Prop, h, Host } from '@stencil/core';
import throttle from 'lodash/throttle';
import { TMP_SELECTION_BG_CLASS } from '../../utils/consts';
import { getCell, styleByCellProps } from '../overlay/selection.utils';
import { DimensionSettingsState, SelectionStoreState, RangeArea } from '@type';
import type { Observable } from '../../utils';

/**
 * Temporary range selection component. Shows temporary range selection.
 */
@Component({
  tag: 'revogr-temp-range',
  styleUrl: 'revogr-temp-range-style.scss',
})
export class RevogrFocus {
  /**
   * Dynamic stores
   */

  /**
   * Selection store, shows current selection and focus
   */
  @Prop() selectionStore: Observable<SelectionStoreState>;

  /**
   * Dimension row store
   */
  @Prop() dimensionRow: Observable<DimensionSettingsState>;
  /**
   * Dimension column store
   */
  @Prop() dimensionCol: Observable<DimensionSettingsState>;

  el?: HTMLElement;
  private readonly onChange = throttle((e: HTMLElement) => this.doChange(e), 300);

  private doChange(e: HTMLElement) {
    e?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  componentDidRender() {
    if (this.el) {
      this.onChange(this.el);
    }
  }

  render() {
    const data = this.selectionStore.get('tempRange');
    const type = this.selectionStore.get('tempRangeType');
    if (!data) {
      return;
    }
    let directionY = 'bottom';
    let derectionX = 'right';
    const range = this.getRange();
    if (!range) {
      return;
    }
    if (data.y < range.y) {
      directionY = 'top';
    }
    if (data.x < range.x) {
      derectionX = 'left';
    }
    const directionClass = `${derectionX} ${directionY}`;
    const cell = getCell(data,
      this.dimensionRow.state,
      this.dimensionCol.state
    );
    const styles = styleByCellProps(cell);
    const props = {
      class: {
        [TMP_SELECTION_BG_CLASS]: true,
        [type || '']: true,
      },
      style: styles,
      hidden: false
    };
    return (
      <Host {...props}>
        <div class={directionClass} ref={(e) => (this.el = e)} />
      </Host>
    );
  }

  private getRange(): RangeArea | null {
    const range = this.selectionStore.get('range');
    if (range) {
      return range;
    }
    const focus = this.selectionStore.get('focus');
    if (!focus) {
      return null;
    }
    return {
      ...focus,
      x1: focus.x,
      y1: focus.y,
    };
  }
}
