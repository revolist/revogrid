import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Prop,
  type VNode,
} from '@stencil/core';

import {
  getColumnGroupRenderIndexes,
  getItemByIndex,
  Groups,
} from '@store';
import { HEADER_ACTUAL_ROW_CLASS, HEADER_ROW_CLASS } from '../../utils/consts';
import HeaderRenderer, { HeaderRenderProps } from './header-renderer';
import { ResizeProps } from './resizable.directive';
import type {
  ColumnRegular,
  DimensionCols,
  DimensionSettingsState,
  InitialHeaderClick,
  ViewportState,
  ViewSettingSizeProp,
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
   * Physical column indexes in their current visible order.
   */
  @Prop() colItems: number[] = [];

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
    const change = changedX / (endIndex - startIndex + 1);
    for (let i = startIndex; i <= endIndex; i++) {
      const item = getItemByIndex(this.dimensionCol.state, i);
      sizes[i] = item.end - item.start + change;
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
    const columnsToRender: HeaderRenderProps[] = [];
    const renderOffset = this.viewportCol.get('renderOffset') || 0;
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
        renderOffset,
        active: this.resizeHandler,
        additionalData: this.additionalData,
        onResize: e => this.onResize(e, rgCol.itemIndex),
        onDblClick: e => this.headerdblClick.emit(e),
        onClick: e => this.initialHeaderClick.emit(e),
      };
      const event = this.beforeHeaderRender.emit(props);
      if (!event.defaultPrevented) {
        columnsToRender.push(event.detail);
      }
    }
    const duplicateProps = this.getDuplicateHeaderProps(columnsToRender);
    const cells = columnsToRender.map(detail =>
      h(HeaderRenderer, {
        key: this.getHeaderCellKey(detail.data, this.type, duplicateProps),
        ...detail,
      }),
    );
    return { cells };
  }

  private renderGroupingColumns(): VNode[] {
    const visibleGroupRange = this.getVisibleGroupRange();
    return Array.from({ length: this.groupingDepth }, (_, level) =>
      this.renderGroupRow(level, visibleGroupRange),
    ).flat();
  }

  private renderGroupRow(
    level: number,
    visibleGroupRange: { start: number; end: number } | undefined,
  ) {
    const groupCells = (this.groups[level] || [])
      .map(group => this.renderGroupColumn(group, level, visibleGroupRange))
      .filter((cell): cell is VNode => !!cell);

    return [
      ...groupCells,
      h('div', {
        key: `group-row-${level}`,
        class: {
          [HEADER_ROW_CLASS]: true,
          group: true,
        },
      }),
    ];
  }

  private renderGroupColumn(
    group: Groups[number][number],
    level: number,
    visibleGroupRange: { start: number; end: number } | undefined,
  ) {
    const groupIndexes = getColumnGroupRenderIndexes(
      group.indexes,
      this.colItems,
    );
    const groupStartIndex = groupIndexes[0] ?? -1;
    if (groupStartIndex < 0) {
      return;
    }

    const groupEndIndex = groupIndexes[groupIndexes.length - 1];
    if (
      !visibleGroupRange ||
      !isGroupInVisibleRange(groupStartIndex, groupEndIndex, visibleGroupRange)
    ) {
      return;
    }

    const groupStart = getItemByIndex(
      this.dimensionCol.state,
      groupStartIndex,
    ).start;
    const groupEnd = getItemByIndex(
      this.dimensionCol.state,
      groupEndIndex,
    ).end;
    const renderGroup = {
      ...group,
      allSourceIndexes: group.indexes,
      indexes: groupIndexes,
    };
    const props: HeaderGroupRendererProps = {
      providers: this.providers,
      start: groupStart,
      end: groupEnd,
      group: renderGroup,
      renderOffset: this.viewportCol.get('renderOffset') || 0,
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
    if (event.defaultPrevented) {
      return;
    }
    return h(GroupHeaderRenderer, {
      key: this.getGroupHeaderCellKey(event.detail.group, level),
      ...event.detail,
    });
  }

  private getVisibleGroupRange() {
    const visibleColumns = this.viewportCol.get('items');
    if (!visibleColumns.length) {
      return;
    }
    return visibleColumns.reduce(
      (range, column) => ({
        start: Math.min(range.start, column.itemIndex),
        end: Math.max(range.end, column.itemIndex),
      }),
      {
        start: visibleColumns[0].itemIndex,
        end: visibleColumns[0].itemIndex,
      },
    );
  }

  private getHeaderCellKey(
    column: ColumnRegular | undefined,
    type: DimensionCols | 'rowHeaders',
    duplicateProps: Set<string>,
  ) {
    if (column?.prop === undefined) {
      return `${type}-${String(column?.index)}`;
    }
    const propKey = String(column.prop);
    if (duplicateProps.has(propKey)) {
      return `${type}-${propKey}-${String(column.index)}`;
    }
    return `${type}-${propKey}`;
  }

  private getDuplicateHeaderProps(columns: HeaderRenderProps[]) {
    const seenProps = new Set<string>();
    const duplicateProps = new Set<string>();

    columns.forEach(({ data }) => {
      if (data?.prop !== undefined) {
        const propKey = String(data.prop);
        if (seenProps.has(propKey)) {
          duplicateProps.add(propKey);
        } else {
          seenProps.add(propKey);
        }
      }
    });

    return duplicateProps;
  }

  private getGroupHeaderCellKey(group: Groups[number][number], level: number) {
    return `group-${level}-${group.name}-${group.indexes.join('-')}`;
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

function isGroupInVisibleRange(
  groupStartIndex: number,
  groupEndIndex: number,
  visibleRange: { start: number; end: number },
) {
  return (
    groupStartIndex <= visibleRange.end &&
    groupEndIndex >= visibleRange.start
  );
}
