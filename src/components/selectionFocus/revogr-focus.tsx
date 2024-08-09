import {
  Component,
  Prop,
  h,
  Host,
  Event,
  Element,
  EventEmitter,
} from '@stencil/core';
import { FOCUS_CLASS } from '../../utils/consts';
import { getElStyle } from '../overlay/selection.utils';
import { DSourceState, getSourceItem } from '@store';
import {
  Cell,
  SelectionStoreState,
  ColumnRegular,
  DataType,
  DimensionSettingsState,
  FocusRenderEvent,
  FocusTemplateFunc,
  DimensionCols,
  DimensionRows,
} from '@type';
import { Observable } from '../../utils/store.utils';

/**
 * Focus component. Shows focus layer around the cell that is currently in focus.
 * @slot focus-${view.type}-${data.type}. @example focus-rgCol-rgRow
 */
@Component({
  tag: 'revogr-focus',
  styleUrl: 'revogr-focus-style.scss',
})
export class RevogrFocus {
  /**
   * Column type
   */
  @Prop() colType!: DimensionCols;
  /**
   * Row type
   */
  @Prop() rowType!: DimensionRows;

  /** Dynamic stores */
  /** Selection, range, focus for selection */
  @Prop() selectionStore!: Observable<SelectionStoreState>;
  /** Dimension settings Y */
  @Prop() dimensionRow!: Observable<DimensionSettingsState>;
  /** Dimension settings X */
  @Prop() dimensionCol!: Observable<DimensionSettingsState>;
  /**
   * Data rows source
   */
  @Prop() dataStore!: Observable<DSourceState<DataType, DimensionRows>>;
  /**
   * Column source
   */
  @Prop() colData!: Observable<DSourceState<ColumnRegular, DimensionCols>>;

  /**
   * Focus template custom function. Can be used to render custom focus layer.
   */
  @Prop() focusTemplate: FocusTemplateFunc | null = null;

  /**
   * Before focus render event.
   * Can be prevented by event.preventDefault().
   * If preventDefault used slot will be rendered.
   */
  @Event({ eventName: 'beforefocusrender' })
  beforeFocusRender: EventEmitter<FocusRenderEvent>;
  /**
   * Before focus changed verify if it's in view and scroll viewport into this view
   * Can be prevented by event.preventDefault()
   */
  @Event({ eventName: 'beforescrollintoview' })
  beforeScrollIntoView: EventEmitter<{ el: HTMLElement }>;
  /**
   * Used to setup properties after focus was rendered
   */
  @Event({ eventName: 'afterfocus' }) afterFocus: EventEmitter<{
    model: any;
    column: ColumnRegular;
  }>;

  @Element() el: HTMLElement;
  private activeFocus: Cell | null = null;

  private changed(e: HTMLElement, focus: Cell) {
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
      column,
    });
  }

  componentDidRender() {
    const currentFocus = this.selectionStore.get('focus');
    if (
      this.activeFocus?.x === currentFocus?.x &&
      this.activeFocus?.y === currentFocus?.y
    ) {
      return;
    }
    this.activeFocus = currentFocus;
    if (currentFocus && this.el) {
      this.changed(this.el, currentFocus);
    }
  }

  render() {
    const editCell = this.selectionStore.get('edit');
    if (editCell) {
      return;
    }
    const focusCell = this.selectionStore.get('focus');
    if (!focusCell) {
      return;
    }
    const event = this.beforeFocusRender.emit({
      range: {
        ...focusCell,
        x1: focusCell.x,
        y1: focusCell.y,
      },
      rowType: this.rowType,
      colType: this.colType,
    });
    if (event.defaultPrevented) {
      return <slot />;
    }
    const { detail } = event;
    const style = getElStyle(
      detail.range,
      this.dimensionRow.state,
      this.dimensionCol.state,
    );
    const extra = this.focusTemplate?.(h, detail);
    return (
      <Host class={FOCUS_CLASS} style={style}>
        <slot />
        {extra}
      </Host>
    );
  }
}
