import { Component, Prop, h, Host } from '@stencil/core';
import { throttle } from 'lodash';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { TMP_SELECTION_BG_CLASS } from '../../utils/consts';
import { getElStyle } from '../overlay/selection.utils';

@Component({
  tag: 'revogr-temp-range',
  styleUrl: 'revogr-temp-range-style.scss',
})
export class RevogrFocus {
  el: HTMLElement;

  /** Dynamic stores */
  @Prop() selectionStore: Observable<Selection.SelectionStoreState>;
  @Prop() dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
  private readonly onChange = throttle((e: HTMLElement) => this.doChange(e), 300);

  private doChange(e: HTMLElement): void {
    e?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  componentDidRender(): void {
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
    const style = getElStyle(data, this.dimensionRow.state, this.dimensionCol.state);
    return (
      <Host
        class={{
          [TMP_SELECTION_BG_CLASS]: true,
          [type || '']: true,
        }}
        style={style}
      >
        <div class={directionClass} ref={(e: HTMLElement) => (this.el = e)} />
      </Host>
    );
  }

  private getRange(): Selection.RangeArea | null {
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
