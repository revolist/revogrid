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
import { getCell, styleByCellProps } from '../overlay/selection.utils';
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
  FocusAfterRenderEvent,
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
  @Event({ eventName: 'afterfocus' })
  afterFocus: EventEmitter<FocusAfterRenderEvent>;

  @Element() el: HTMLElement;
  private activeFocus: Cell | null = null;

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
      const beforeScrollIn = this.beforeScrollIntoView.emit({ el: this.el });
      if (!beforeScrollIn.defaultPrevented) {
        this.el.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
      }
      const model = getSourceItem(this.dataStore, currentFocus.y);
      const column = getSourceItem(this.colData, currentFocus.x);
      this.afterFocus.emit({
        model,
        column,
        rowType: this.rowType,
        colType: this.colType,
        rowIndex: currentFocus.y,
        colIndex: currentFocus.x,
      });
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
      rowDimension: { ...this.dimensionRow.state },
      colDimension: { ...this.dimensionCol.state },
    });
    if (event.defaultPrevented) {
      return <slot />;
    }
    const { detail } = event;

    const cell = getCell(
      detail.range,
      event.detail.rowDimension,
      event.detail.colDimension,
    );
    const styles = styleByCellProps(cell);
    const extra = this.focusTemplate?.(h, detail);
    const props = {
      class: { [FOCUS_CLASS]: true },
      style: styles,
    };
    return (
      <Host {...props}>
        <slot />
        {extra}
      </Host>
    );
  }
}
