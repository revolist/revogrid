import { h } from '@stencil/core';
import RowRenderer from '../../components/data/row-renderer';
import {
  GROUP_DEPTH,
  GROUP_EXPANDED,
  GROUP_EXPAND_BTN,
  PSEUDO_GROUP_ITEM,
  GROUP_EXPAND_EVENT,
} from './grouping.const';
import type { RowGroupingProps } from './grouping.row.types';
import type { DataType } from '@type';

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

export const GroupingRowRenderer = (props: RowGroupingProps) => {
  const { model, itemIndex, hasExpand, groupingCustomRenderer } = props;
  const name = model[PSEUDO_GROUP_ITEM];
  const expanded = model[GROUP_EXPANDED];
  const depth = parseInt(model[GROUP_DEPTH], 10) || 0;

  if (groupingCustomRenderer) {
    return (
      <RowRenderer {...props} rowClass="groupingRow" depth={depth}>
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
    <RowRenderer {...props} rowClass="groupingRow" depth={depth}>
      {hasExpand && [
        <button
          class={{ [GROUP_EXPAND_BTN]: true }}
          onClick={e => expandEvent(e, model, itemIndex)}
        >
          {expandSvgIconVNode(expanded)}
        </button>,
        name,
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
