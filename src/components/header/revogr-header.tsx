import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Prop,
  type VNode,
} from '@stencil/core';
import keyBy from 'lodash/keyBy';

import { getItemByIndex, Group, Groups } from '@store';
import { HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS } from '../../utils/consts';
import HeaderRenderer, { HeaderRenderProps } from './header-renderer';
import { ResizeProps } from './resizable.directive';
import type {
  ColumnRegular,
  DimensionSettingsState,
  InitialHeaderClick,
  ViewportState,
  ViewSettingSizeProp,
  DimensionCols,
  SelectionStoreState,
  RangeArea,
  VirtualPositionItem,
  ProvidersColumns,
} from '@type';
import type { Observable } from '../../utils';
import GroupHeaderRenderer, {
  HeaderGroupRendererProps,
} from './header-group-renderer';

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

  /**
   * Before each header cell render function. Allows to override cell properties
   */
  @Event({ eventName: 'beforeheaderrender' })
  beforeHeaderRender: EventEmitter<HeaderRenderProps>;

  /**
   * Before each group header cell render function. Allows to override group header cell properties
   */
  @Event({ eventName: 'beforegroupheaderrender' })
  beforeGroupHeaderRender: EventEmitter<HeaderGroupRendererProps>;

  /**
   * After all header cells rendered. Finalizes cell rendering.
   */
  @Event({ eventName: 'afterheaderrender' })
  afterHeaderRender: EventEmitter<ProvidersColumns>;

  // #endregion

  @Element() element!: HTMLElement;

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

  componentDidRender() {
    this.afterHeaderRender.emit(this.providers);
  }

  render() {
    const cols = this.viewportCol.get('items');
    const range = this.selectionStore?.get('range');

    const { cells } = this.renderHeaderColumns(cols, range);
    const groupRow = this.renderGroupingColumns();

    return [
      <div class="group-rgRow">{groupRow}</div>,
      <div class={`${HEADER_ROW_CLASS} ${HEADER_ACTUAL_ROW_CLASS}`}>
        {cells}
      </div>,
    ];
  }

  private renderHeaderColumns(
    cols: VirtualPositionItem[],
    range: RangeArea | null,
  ) {
    const cells: VNode[] = [];
    for (let rgCol of cols) {
      const colData = this.colData[rgCol.itemIndex];
      const props: HeaderRenderProps = {
        range,
        column: rgCol,
        data: {
          ...colData,
          index: rgCol.itemIndex,
          providers: this.providers,
        },
        canFilter: !!this.columnFilter,
        canResize: this.canResize,
        active: this.resizeHandler,
        additionalData: this.additionalData,
        onResize: e => this.onResize(e, rgCol.itemIndex),
        onDblClick: e => this.headerdblClick.emit(e),
        onClick: e => this.initialHeaderClick.emit(e),
      };
      const event = this.beforeHeaderRender.emit(props);
      if (!event.defaultPrevented) {
        cells.push(<HeaderRenderer {...event.detail} />);
      }
    }
    return { cells };
  }

  private findGroupsByDepth(parents: Group[], maxDepth: number, currentDepth = 0): Group[] {
    if (currentDepth === maxDepth || parents.length === 0) {
      return parents;
    }
    const nextGroups = [];
    for (let parent of parents) {
      if (parent.children) {
        let i = parent.indexes[0];

        nextGroups.push(...parent.children.map(c => {
          const count = c.children ? c.children.length : 1;
          const start = i;
          i += count;

          return {
            ...c,
            indexes: [start, start + count - 1],
            children: c.children ?? [],
            name: c.name ?? '',
          };
        }));
      }
    }    
    return this.findGroupsByDepth(nextGroups, maxDepth, currentDepth + 1);
  }

  private renderGroupingColumns(): VNode[] {
    const groupRow: VNode[] = [];
    for (let i = 0; i < this.groupingDepth; i++) {
      let groups = this.findGroupsByDepth(this.groups[0], i);

      for (let group of groups) {
        if (!group.children) {
          continue; // skip leafs
        }      

        for (let group of groups) {
          const groupStartIndex = group.indexes[0] ?? -1;
          if (groupStartIndex > -1) {
            const groupEndIndex = group.indexes[group.indexes.length - 1];

            const groupStart = getItemByIndex(
              this.dimensionCol.state,
              groupStartIndex,
            ).start;
            const groupEnd = getItemByIndex(
              this.dimensionCol.state,
              groupEndIndex,
            ).end;

            const props: HeaderGroupRendererProps = {
              providers: this.providers,
              start: groupStart,
              end: groupEnd,
              group,
              active: this.resizeHandler,
              canResize: this.canResize,
              additionalData: this.additionalData,
              onResize: e =>
                this.onResizeGroup(
                  e.changedX ?? 0,
                  groupStartIndex,
                  groupEndIndex,
                ),
            };
            const event = this.beforeGroupHeaderRender.emit(props);
            if (!event.defaultPrevented) {
              groupRow.push(<GroupHeaderRenderer {...event.detail} />);
            }
          }
        }
      }
      groupRow.push(<div class={`${HEADER_ROW_CLASS} group`} />);
    }
    return groupRow;
  }

  get providers(): ProvidersColumns<DimensionCols | 'rowHeaders'> {
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
