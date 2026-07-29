import { h } from '@stencil/core';
import RowRenderer from '../../components/data/row-renderer';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  GROUP_EXPAND_BTN,
  PSEUDO_GROUP_ITEM,
  GROUP_EXPAND_EVENT,
  GROUP_COLUMN_PROP,
} from './grouping.const';
import type {
  GroupCellTemplateProp,
  RowGroupingProps,
} from './grouping.row.types';
import type { DataType, VNodeResponse } from '@type';
import { getSourceItem } from '@store';
import { CELL_CLASS, DATA_COL, DATA_ROW, getCellRaw } from '../../utils';
import { isGroupingColumn } from './grouping.service';

export function expandEvent(
  e: MouseEvent,
  model: DataType,
  virtualIndex: number,
) {
  const event = new CustomEvent(GROUP_EXPAND_EVENT, {
    detail: {
      model,
      virtualIndex,
    },
    cancelable: true,
    bubbles: true,
  }) as CustomEvent<HTMLRevoGridElementEventMap['groupexpandclick']>;
  e.target?.dispatchEvent(event);
}

export function renderGroupCells(
  props: RowGroupingProps,
  {
    name,
    expanded,
    depth,
  }: {
    name: string;
    expanded: boolean;
    depth: number;
  },
): VNodeResponse[] {
  const {
    additionalData,
    columnItems,
    groupingCellRenderer,
    hasExpand,
    itemIndex,
    model,
    providers,
    size,
    start,
    end,
  } = props;
  if (!groupingCellRenderer) {
    return [];
  }

  const renderOffset = providers.viewport.get('renderOffset') || 0;
  const data = providers.data.get('source');
  const rowItem = { itemIndex, size, start, end };
  const onExpand = (event: MouseEvent) => expandEvent(event, model, itemIndex);

  return columnItems.map(columnItem => {
    const column = getSourceItem(providers.columns, columnItem.itemIndex);
    if (!column) {
      return null;
    }
    const isLabelColumn = isGroupingColumn(column);
    const templateProps: GroupCellTemplateProp = {
      prop: column.prop,
      model,
      data,
      column,
      rowIndex: itemIndex,
      colIndex: columnItem.itemIndex,
      colType: providers.colType,
      type: providers.type,
      value: getCellRaw(model, column),
      providers,
      columnItem,
      rowItem,
      group: {
        name,
        depth,
        expanded,
        prop: model[GROUP_COLUMN_PROP],
        isLabelColumn,
        canExpand: hasExpand,
        onExpand,
      },
    };

    return (
      <div
        key={columnItem.itemIndex}
        class={{
          [CELL_CLASS]: true,
          groupingCell: true,
          groupingLabelCell: isLabelColumn,
        }}
        {...{
          [DATA_COL]: columnItem.itemIndex,
          [DATA_ROW]: itemIndex,
        }}
        style={{
          width: `${columnItem.size}px`,
          transform: `translateX(${columnItem.start - renderOffset}px)`,
          height: size ? `${size}px` : undefined,
        }}
      >
        {groupingCellRenderer(h, templateProps, additionalData)}
      </div>
    );
  });
}

export const GroupingRowRenderer = (props: RowGroupingProps) => {
  const {
    model,
    itemIndex,
    hasExpand,
    groupingCustomRenderer,
    groupingCellRenderer,
  } = props;
  const name = model[PSEUDO_GROUP_ITEM];
  const expanded = model[GROUP_EXPANDED];
  const depth = parseInt(model[GROUP_DEPTH], 10) || 0;
  const groupRowAttrs = {
    rowClass: 'groupingRow',
    depth,
    expanded,
  };

  if (groupingCellRenderer) {
    return (
      <RowRenderer
        index={props.index}
        size={props.size}
        start={props.start}
        {...groupRowAttrs}
      >
        {renderGroupCells(props, { name, expanded, depth })}
      </RowRenderer>
    );
  }

  if (groupingCustomRenderer) {
    return (
      <RowRenderer {...props} {...groupRowAttrs}>
        <div onClick={e => expandEvent(e, model, itemIndex)}>
          {groupingCustomRenderer(h, {
            ...props,
            colType: props.providers.colType,
            name,
            expanded,
            depth,
          })}
        </div>
      </RowRenderer>
    );
  }

  return (
    <RowRenderer {...props} {...groupRowAttrs}>
      {hasExpand && [
        <button
          class={{ [GROUP_EXPAND_BTN]: true }}
          onClick={e => expandEvent(e, model, itemIndex)}
        >
          {expandSvgIconVNode(expanded)}
        </button>,
        String(name),
      ]}
    </RowRenderer>
  );
};

export const expandSvgIconVNode = (expanded = false) => {
  return (
    <svg
      aria-hidden="true"
      style={{ transform: `rotate(${!expanded ? -90 : 0}deg)` }}
      focusable="false"
      viewBox="0 0 448 512"
    >
      <path
        fill="currentColor"
        d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"
      ></path>
    </svg>
  );
};

export default GroupingRowRenderer;
