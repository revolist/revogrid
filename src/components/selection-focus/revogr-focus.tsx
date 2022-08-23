import { Component, Prop, h, Host, Element, Event, EventEmitter } from '@stencil/core';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { getSourceItem } from '../../store/dataSource/data.store';
import { FOCUS_CLASS } from '../../utils/consts';
import { RowSource } from '../data/columnService';
import { getElStyle } from '../overlay/selection.utils';

@Component({
  tag: 'revogr-focus',
  styleUrl: 'revogr-focus-style.scss',
})
export class RevogrFocus {
  @Element() el: HTMLElement;

  /** Dynamic stores */
  @Prop() dataStore!: RowSource;
  @Prop() selectionStore!: Observable<Selection.SelectionStoreState>;
  @Prop() dimensionRow!: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol!: Observable<RevoGrid.DimensionSettingsState>;
  @Event({ eventName: 'afterfocus' }) afterFocus: EventEmitter<{
    model: any;
  }>;

  private changed(e: HTMLElement, focus: Selection.Cell): void {
    e?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
    const model = getSourceItem(this.dataStore, focus.y) || {};
    this.afterFocus.emit({
      model
    });
  }

  componentDidRender(): void {
    const currentFocus = this.selectionStore.get('focus');
    currentFocus && this.el && this.changed(this.el, currentFocus);
  }

  render() {
    const data = this.selectionStore.get('focus');
    if (data) {
      const style = getElStyle(
        {
          ...data,
          x1: data.x,
          y1: data.y,
        },
        this.dimensionRow.state,
        this.dimensionCol.state,
      );
      return <Host class={FOCUS_CLASS} style={style} />;
    }
  }
}
