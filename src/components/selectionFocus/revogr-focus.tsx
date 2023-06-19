import { Component, Prop, h, Host, Event, Element, EventEmitter } from '@stencil/core';
import { FocusRenderEvent, Observable, RevoGrid, Selection } from '../../interfaces';
import { FOCUS_CLASS } from '../../utils/consts';
import { ColumnSource, RowSource } from '../data/columnService';
import { getElStyle } from '../overlay/selection.utils';
import { getSourceItem } from '../../store/dataSource/data.store';

@Component({
  tag: 'revogr-focus',
  styleUrl: 'revogr-focus-style.scss',
})
export class RevogrFocus {
  @Element() el: HTMLElement;

  /** Dynamic stores */
  @Prop() selectionStore!: Observable<Selection.SelectionStoreState>;
  @Prop() dimensionRow!: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dimensionCol!: Observable<RevoGrid.DimensionSettingsState>;
  @Prop() dataStore!: RowSource;
  @Prop() colData!: ColumnSource;
  @Prop() colType!: RevoGrid.DimensionCols;
  @Prop() rowType!: RevoGrid.DimensionRows;

  @Prop() focusTemplate: RevoGrid.FocusTemplateFunc | null = null;
  @Event({ eventName: 'before-focus-render' }) beforeFocusRender: EventEmitter<FocusRenderEvent>;
  /**
   * Before focus changed verify if it's in view and scroll viewport into this view
   * Can be prevented by event.preventDefault()
   */
  @Event({ eventName: 'beforescrollintoview' }) beforeScrollIntoView: EventEmitter<{ el: HTMLElement }>;
  /**
   * Used to setup properties after focus was rendered
   */
  @Event({ eventName: 'afterfocus' }) afterFocus: EventEmitter<{
    model: any;
    column: RevoGrid.ColumnRegular;
  }>;

  private activeFocus: Selection.Cell = null;

  private changed(e: HTMLElement, focus: Selection.Cell): void {
    const beforeScrollIn = this.beforeScrollIntoView.emit({ el: e });
    if (!beforeScrollIn.defaultPrevented) {
      e.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
    const model = getSourceItem(this.dataStore, focus.y);
    const column = getSourceItem(this.colData, focus.x);
    this.afterFocus.emit({
      model,
      column
    });
  }

  componentDidRender(): void {
    const currentFocus = this.selectionStore.get('focus');
    if (this.activeFocus?.x === currentFocus?.x && this.activeFocus?.y === currentFocus?.y) {
      return;
    }
    this.activeFocus = currentFocus;
    currentFocus && this.el && this.changed(this.el, currentFocus);
  }

  render() {
    const editCell = this.selectionStore.get('edit');
    if (editCell) {
      return;
    }
    const data = this.selectionStore.get('focus');
    if (data) {
      const event = this.beforeFocusRender.emit({
        range: {
          ...data,
          x1: data.x,
          y1: data.y,
        },
        rowType: this.rowType,
        colType: this.colType,
      });
      if (event.defaultPrevented) {
        return <slot/>;
      }
      const { detail } = event;
      const style = getElStyle(
        detail.range,
        this.dimensionRow.state,
        this.dimensionCol.state,
      );
      const extra = this.focusTemplate && this.focusTemplate(h, detail);
      return <Host class={FOCUS_CLASS} style={style}><slot/>{ extra }</Host>;
    }
  }
}
