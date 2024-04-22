import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Prop,
} from '@stencil/core';
import { HTMLStencilElement, VNode } from '@stencil/core/internal';
import keyBy from 'lodash/keyBy';

import { HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS } from '../../utils/consts';
import { Groups } from '../../store/dataSource/data.store';
import HeaderRenderer from './header-renderer';
import ColumnGroupsRenderer from '../../plugins/groupingColumn/columnGroupsRenderer';
import { ResizeProps } from '../../services/resizable.directive';
import {
  ColumnRegular,
  DimensionSettingsState,
  InitialHeaderClick,
  Observable,
  Providers,
  ViewportState,
  ViewSettingSizeProp,
} from '../../types/interfaces';
import { DimensionCols } from '../../types/dimension';
import { SelectionStoreState } from '../../types/selection';

@Component({
  tag: 'revogr-header',
  styleUrl: 'revogr-header-style.scss',
})
export class RevogrHeaderComponent {
  // #region Properties
  /**
   * Stores
   */
  /** Viewport X */
  @Prop() viewportCol: Observable<ViewportState>;
  /** Dimension settings X */
  @Prop() dimensionCol: Observable<DimensionSettingsState>;
  /** Selection, range, focus */
  @Prop() selectionStore: Observable<SelectionStoreState>;

  /**
   * Column groups
   */
  @Prop() groups: Groups;
  /**
   * Grouping depth, how many levels of grouping
   */
  @Prop() groupingDepth = 0;

  /**
   * Readonly mode
   */
  @Prop() readonly: boolean;
  /**
   * If columns can be resized
   */
  @Prop() canResize: boolean;
  /**
   * Defines resize position
   */
  @Prop() resizeHandler: ResizeProps['active'];

  /**
   * Columns - defines an array of grid columns.
   */
  @Prop() colData: ColumnRegular[];

  /**
   * Column filter
   */
  @Prop() columnFilter: boolean;

  /**
   * Column type
   */
  @Prop() type!: DimensionCols | 'rowHeaders';

  /**
   * Extra properties to pass into header renderer, such as vue or react components to handle parent
   */
  @Prop() additionalData: any = {};
  // #endregion

  // #region Events

  /**
   * On initial header click
  */
  @Event({
    eventName: 'beforeheaderclick',
  })
  initialHeaderClick: EventEmitter<InitialHeaderClick>;

  /**
   * On header resize
  */
  @Event({
    eventName: 'headerresize',
  })
  headerresize: EventEmitter<ViewSettingSizeProp>;

  /**
   * On before header resize
  */
  @Event({ eventName: 'beforeheaderresize', cancelable: true })
  beforeResize: EventEmitter<ColumnRegular[]>;

  /**
   * On header double click
   */
  @Event({
    eventName: 'headerdblclick',
  })
  headerdblClick: EventEmitter<InitialHeaderClick>;
  // #endregion

  @Element() element!: HTMLStencilElement;

  private onResize({ width }: { width?: number }, index: number) {
    const col = this.colData[index];
    const event = this.beforeResize.emit([
      {
        ...col,
        size: width || undefined,
      },
    ]);
    if (event.defaultPrevented) {
      return;
    }
    this.headerresize.emit({ [index]: width || 0 });
  }

  private onResizeGroup(
    changedX: number,
    startIndex: number,
    endIndex: number,
  ) {
    const sizes: ViewSettingSizeProp = {};
    const cols = keyBy(this.viewportCol.get('items'), 'itemIndex');
    const change = changedX / (endIndex - startIndex + 1);
    for (let i = startIndex; i <= endIndex; i++) {
      const item = cols[i];
      if (item) {
        sizes[i] = item.size + change;
      }
    }
    this.headerresize.emit(sizes);
  }

  render() {
    const cols = this.viewportCol.get('items');
    const range = this.selectionStore?.get('range');
    const cells: VNode[] = [];
    const visibleProps: { [prop: string]: number } = {};

    // render header columns
    for (let rgCol of cols) {
      const colData = this.colData[rgCol.itemIndex];
      cells.push(
        <HeaderRenderer
          range={range}
          column={rgCol}
          data={{
            ...colData,
            index: rgCol.itemIndex,
            providers: this.providers,
          }}
          canFilter={!!this.columnFilter}
          canResize={this.canResize}
          active={this.resizeHandler}
          onResize={e => this.onResize(e, rgCol.itemIndex)}
          onDoubleClick={e => this.headerdblClick.emit(e)}
          onClick={e => this.initialHeaderClick.emit(e)}
          additionalData={this.additionalData}
        />,
      );
      visibleProps[colData?.prop] = rgCol.itemIndex;
    }

    return [
      <div class="group-rgRow">
        <ColumnGroupsRenderer
          canResize={this.canResize}
          active={this.resizeHandler}
          visibleProps={visibleProps}
          providers={this.providers}
          groups={this.groups}
          dimensionCol={this.dimensionCol.state}
          depth={this.groupingDepth}
          onResize={(changedX, startIndex, endIndex) =>
            this.onResizeGroup(changedX, startIndex, endIndex)
          }
          additionalData={this.additionalData}
        />
      </div>,
      <div class={`${HEADER_ROW_CLASS} ${HEADER_ACTUAL_ROW_CLASS}`}>
        {cells}
      </div>,
    ];
  }

  get providers(): Providers<DimensionCols | 'rowHeaders'> {
    return {
      type: this.type,
      readonly: this.readonly,
      data: this.colData,
      viewport: this.viewportCol,
      dimension: this.dimensionCol,
      selection: this.selectionStore,
    };
  }
}
